const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const backgroundSource = fs.readFileSync(
  path.join(__dirname, "..", "background.js"),
  "utf8"
);

test("background relays bookmark-bar requests to the best WhatsApp tab", async () => {
  let registeredListener = null;
  const queried = [];
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query(details) {
        queried.push(details);
        return [
          { id: 1, windowId: 1, active: false },
          { id: 2, windowId: 2, active: true }
        ];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  assert.equal(typeof registeredListener, "function");

  const response = await new Promise((resolve) => {
    registeredListener(
      { type: "BOOKMARK_BAR_REQUEST_CHATS" },
      { tab: { id: 99, windowId: 1 } },
      resolve
    );
  });

  assert.deepEqual(JSON.parse(JSON.stringify(queried)), [{ url: "https://web.whatsapp.com/*" }]);
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    {
      tabId: 1,
      message: { type: "BOOKMARK_BAR_REQUEST_CHATS" }
    }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { ok: true });
});

test("background relays to a tab with id 0", async () => {
  let registeredListener = null;
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query() {
        return [{ id: 0, windowId: 1, active: true }];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener(
      { type: "BOOKMARK_BAR_SEND", chatId: "chat-0", text: "hi" },
      { tab: { id: 99, windowId: 1 } },
      resolve
    );
  });

  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    {
      tabId: 0,
      message: { type: "BOOKMARK_BAR_SEND", chatId: "chat-0", text: "hi" }
    }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { ok: true });
});

test("background returns the WhatsApp content-script send result", async () => {
  let registeredListener = null;

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    commands: {
      onCommand: {
        addListener() {}
      }
    },
    storage: {
      onChanged: {
        addListener() {}
      }
    },
    tabs: {
      async query() {
        return [{ id: 7, windowId: 1, active: true }];
      },
      async sendMessage() {
        return { ok: false, error: "compose box not found" };
      }
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener(
      { type: "BOOKMARK_BAR_SEND", chatId: "chat-0", text: "hi" },
      { tab: { id: 99, windowId: 1 } },
      resolve
    );
  });

  assert.deepEqual(JSON.parse(JSON.stringify(response)), {
    ok: false,
    error: "compose box not found"
  });
});

test("background prefers the active tab in the sender window", async () => {
  let registeredListener = null;
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query() {
        return [
          { id: 11, windowId: 1, active: false },
          { id: 12, windowId: 1, active: true },
          { id: 21, windowId: 2, active: true }
        ];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener(
      { type: "BOOKMARK_BAR_REQUEST_CHATS" },
      { tab: { id: 99, windowId: 1 } },
      resolve
    );
  });

  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    {
      tabId: 12,
      message: { type: "BOOKMARK_BAR_REQUEST_CHATS" }
    }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { ok: true });
});

test("background uses the globally active tab when no sender-window match exists", async () => {
  let registeredListener = null;
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query() {
        return [
          { id: 31, windowId: 1, active: false },
          { id: 32, windowId: 2, active: true },
          { id: 33, windowId: 3, active: false }
        ];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener(
      { type: "BOOKMARK_BAR_REQUEST_CHATS" },
      { tab: { id: 99, windowId: 9 } },
      resolve
    );
  });

  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    {
      tabId: 32,
      message: { type: "BOOKMARK_BAR_REQUEST_CHATS" }
    }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { ok: true });
});

test("background uses the first tab when no active tab exists", async () => {
  let registeredListener = null;
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query() {
        return [
          { id: 41, windowId: 1, active: false },
          { id: 42, windowId: 2, active: false }
        ];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener(
      { type: "BOOKMARK_BAR_REQUEST_CHATS" },
      { tab: { id: 99, windowId: 9 } },
      resolve
    );
  });

  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    {
      tabId: 41,
      message: { type: "BOOKMARK_BAR_REQUEST_CHATS" }
    }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { ok: true });
});

test("background returns a useful error when WhatsApp Web is not open", async () => {
  let registeredListener = null;

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query() {
        return [];
      },
      async sendMessage() {}
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener(
      { type: "BOOKMARK_BAR_SEND", chatId: "chat-1", text: "hi" },
      { tab: { id: 99, windowId: 3 } },
      resolve
    );
  });

  assert.equal(response.ok, false);
  assert.match(response.error, /WhatsApp Web is not open/);
});

test("background reports bookmark-bar availability when WhatsApp Web is open", async () => {
  let registeredListener = null;
  const queried = [];
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query(details) {
        queried.push(details);
        return [{ id: 1, windowId: 1, active: true }];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener({ type: "BOOKMARK_BAR_STATUS" }, {}, resolve);
  });

  assert.deepEqual(JSON.parse(JSON.stringify(queried)), [{ url: "https://web.whatsapp.com/*" }]);
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { ok: true, available: true });
});

test("background reports bookmark-bar availability when WhatsApp Web is closed", async () => {
  let registeredListener = null;

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredListener = listener;
        }
      }
    },
    tabs: {
      async query() {
        return [];
      },
      async sendMessage() {}
    }
  };

  vm.runInNewContext(backgroundSource, { chrome, Set, Array }, { filename: "background.js" });

  const response = await new Promise((resolve) => {
    registeredListener({ type: "BOOKMARK_BAR_STATUS" }, {}, resolve);
  });

  assert.deepEqual(JSON.parse(JSON.stringify(response)), { ok: true, available: false });
});

test("background shortcut toggles bookmark bar state in storage", async () => {
  let registeredMessageListener = null;
  let registeredCommandListener = null;
  const writes = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredMessageListener = listener;
        }
      }
    },
    commands: {
      onCommand: {
        addListener(listener) {
          registeredCommandListener = listener;
        }
      }
    },
    storage: {
      local: {
        async get() {
          return {
            waPrivacyBlurSettings: {
              enabled: true,
              hoverReveal: true,
              idleBlurEnabled: false,
              idleTimeoutMs: 30000,
              temporaryRevealSeconds: 12,
              bookmarkBarEnabled: false,
              keepWhatsAppAlive: false,
              pinnedContacts: [],
              bookmarkBarColor: "#f1f3f4",
              cinematicBlurEnabled: false,
              cinematicBlurStyle: "scanline",
              bossKeyEnabled: false,
              bossKeyTheme: "spreadsheet",
              readReceiptProtectionEnabled: false,
              dashboardEnabled: false,
              morseNotificationsEnabled: false,
              morseContact: "",
              fakeMeetingEnabled: false,
              fakeMeetingTemplate: "calendar",
              danmuModeEnabled: false,
              danmuSpeed: "normal",
              blurTargets: {
                contactList: true,
                chatText: true,
                avatars: true,
                previewText: true,
                mediaPreviews: true,
                voiceMessages: true,
                timestamps: false,
                otherUi: false
              }
            }
          };
        },
        async set(value) {
          writes.push(value);
        }
      }
    },
    tabs: {
      async query() {
        return [];
      },
      async sendMessage() {}
    }
  };

  vm.runInNewContext(backgroundSource, {
    chrome,
    Set,
    Array,
    importScripts() {},
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js")
  }, { filename: "background.js" });

  assert.equal(typeof registeredMessageListener, "function");
  assert.equal(typeof registeredCommandListener, "function");

  registeredCommandListener("toggle-bookmark-bar");
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(writes.length, 1);
  assert.equal(
    JSON.parse(JSON.stringify(writes[0])).waPrivacyBlurSettings.bookmarkBarEnabled,
    true
  );
  assert.equal(
    JSON.parse(JSON.stringify(writes[0])).waPrivacyBlurSettings.temporaryRevealSeconds,
    12
  );
});

test("background shortcut triggers temporary reveal using the configured duration", async () => {
  let registeredMessageListener = null;
  let registeredCommandListener = null;
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          registeredMessageListener = listener;
        }
      }
    },
    commands: {
      onCommand: {
        addListener(listener) {
          registeredCommandListener = listener;
        }
      }
    },
    storage: {
      local: {
        async get() {
          return {
            waPrivacyBlurSettings: {
              enabled: true,
              hoverReveal: true,
              idleBlurEnabled: false,
              idleTimeoutMs: 30000,
              temporaryRevealSeconds: 9,
              bookmarkBarEnabled: false,
              keepWhatsAppAlive: false,
              pinnedContacts: [],
              bookmarkBarColor: "#f1f3f4",
              cinematicBlurEnabled: false,
              cinematicBlurStyle: "scanline",
              bossKeyEnabled: false,
              bossKeyTheme: "spreadsheet",
              readReceiptProtectionEnabled: false,
              dashboardEnabled: false,
              morseNotificationsEnabled: false,
              morseContact: "",
              fakeMeetingEnabled: false,
              fakeMeetingTemplate: "calendar",
              danmuModeEnabled: false,
              danmuSpeed: "normal",
              blurTargets: {
                contactList: true,
                chatText: true,
                avatars: true,
                previewText: true,
                mediaPreviews: true,
                voiceMessages: true,
                timestamps: false,
                otherUi: false
              }
            }
          };
        },
        async set() {}
      }
    },
    tabs: {
      async query() {
        return [{ id: 77, windowId: 1, active: true }];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, {
    chrome,
    Set,
    Array,
    importScripts() {},
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js")
  }, { filename: "background.js" });

  assert.equal(typeof registeredMessageListener, "function");
  assert.equal(typeof registeredCommandListener, "function");

  registeredCommandListener("temporary-reveal");
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    {
      tabId: 77,
      message: {
        type: "WHATSAPP_BLUR_SHOW_ALL_TEMPORARILY",
        durationMs: 9000
      }
    }
  ]);
});

test("background boss-key shortcut toggles the overlay without rewriting settings", async () => {
  let registeredCommandListener = null;
  const writes = [];
  const sent = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener() {}
      }
    },
    commands: {
      onCommand: {
        addListener(listener) {
          registeredCommandListener = listener;
        }
      }
    },
    storage: {
      local: {
        async get() {
          return {
            waPrivacyBlurSettings: {
              bossKeyEnabled: true,
              bossKeyTheme: "terminal"
            }
          };
        },
        async set(value) {
          writes.push(value);
        }
      }
    },
    tabs: {
      async query() {
        return [{ id: 44, active: true }];
      },
      async sendMessage(tabId, message) {
        sent.push({ tabId, message });
      }
    }
  };

  vm.runInNewContext(backgroundSource, {
    chrome,
    Set,
    Array,
    importScripts() {},
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js")
  }, { filename: "background.js" });

  registeredCommandListener("toggle-boss-key");
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(writes, []);
  assert.deepEqual(JSON.parse(JSON.stringify(sent)), [
    {
      tabId: 44,
      message: { type: "WHATSAPP_BLUR_BOSS_KEY_TOGGLE" }
    }
  ]);
});

test("background sends morse only for new incoming messages matching the filter", async () => {
  let registeredStorageListener = null;
  const badgeTexts = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener() {}
      }
    },
    storage: {
      local: {
        async get() {
          return {
            waPrivacyBlurSettings: {
              morseNotificationsEnabled: true,
              morseContact: "Alice"
            }
          };
        }
      },
      onChanged: {
        addListener(listener) {
          registeredStorageListener = listener;
        }
      }
    },
    action: {
      setBadgeText({ text }) {
        badgeTexts.push(text);
      },
      setBadgeBackgroundColor() {}
    },
    tabs: {
      async query() {
        return [];
      }
    }
  };

  vm.runInNewContext(backgroundSource, {
    chrome,
    Set,
    Array,
    setTimeout() {
      return 1;
    },
    importScripts() {},
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js"),
    WhatsAppBlurMorseCode: require("../src/shared/morse-code.js"),
    WhatsAppBlurDashboardData: require("../src/content/dashboard-data.js")
  }, { filename: "background.js" });

  assert.equal(typeof registeredStorageListener, "function");

  registeredStorageListener(
    {
      waBookmarkBarData: {
        oldValue: {
          chats: [{ id: "chat-1", name: "Alice" }],
          messagesByChatId: { "chat-1": [] }
        },
        newValue: {
          chats: [{ id: "chat-1", name: "Alice" }],
          messagesByChatId: {
            "chat-1": [{ id: "m1", text: "hello", direction: "incoming" }]
          }
        }
      }
    },
    "local"
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(badgeTexts[0], ".");
});

test("background sends morse from incoming message event batches", async () => {
  let registeredStorageListener = null;
  const badgeTexts = [];

  const chrome = {
    runtime: {
      onMessage: {
        addListener() {}
      }
    },
    storage: {
      local: {
        async get() {
          return {
            waPrivacyBlurSettings: {
              morseNotificationsEnabled: true,
              morseContact: "Alice"
            }
          };
        }
      },
      onChanged: {
        addListener(listener) {
          registeredStorageListener = listener;
        }
      }
    },
    action: {
      setBadgeText({ text }) {
        badgeTexts.push(text);
      },
      setBadgeBackgroundColor() {}
    },
    tabs: {
      async query() {
        return [];
      }
    }
  };

  vm.runInNewContext(backgroundSource, {
    chrome,
    Set,
    Array,
    setTimeout() {
      return 1;
    },
    importScripts() {},
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js"),
    WhatsAppBlurMorseCode: require("../src/shared/morse-code.js"),
    WhatsAppBookmarkData: require("../src/shared/bookmark-data.js"),
    WhatsAppBlurDashboardData: require("../src/content/dashboard-data.js")
  }, { filename: "background.js" });

  assert.equal(typeof registeredStorageListener, "function");

  registeredStorageListener(
    {
      waIncomingMessageEvents: {
        oldValue: {
          id: "batch-old",
          entries: [{ eventId: "old-event", contactName: "Alice" }]
        },
        newValue: {
          id: "batch-new",
          entries: [
            { eventId: "event-1", contactName: "Alice", text: "hello" },
            { eventId: "event-2", contactName: "Bob", text: "ignored" }
          ]
        }
      }
    },
    "local"
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(badgeTexts[0], ".");
});
