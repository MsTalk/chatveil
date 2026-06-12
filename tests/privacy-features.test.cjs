const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dashboardApi = require("../src/content/dashboard-data.js");
const morseApi = require("../src/shared/morse-code.js");

test("boss key keeps its expanded camouflage payload bounded", () => {
  const sourcePath = path.join(__dirname, "..", "src", "content", "boss-key.js");
  assert.equal(fs.statSync(sourcePath).size < 26000, true);
});

test("boss key fills the page with communications and restores tab metadata", () => {
  const app = { style: { visibility: "visible" } };
  const iconAttributes = new Map([["href", "original.ico"]]);
  const icon = {
    getAttribute(name) {
      return iconAttributes.get(name) || null;
    },
    setAttribute(name, value) {
      iconAttributes.set(name, value);
    }
  };
  const bodyChildren = [];
  const documentStub = {
    title: "WhatsApp",
    body: {
      appendChild(node) {
        bodyChildren.push(node);
      }
    },
    head: {
      appendChild(node) {
        bodyChildren.push(node);
      }
    },
    createElement(tagName) {
      return {
        tagName,
        className: "",
        id: "",
        innerHTML: "",
        style: {},
        setAttribute(name, value) {
          this[name] = value;
        },
        remove() {
          const index = bodyChildren.indexOf(this);
          if (index >= 0) bodyChildren.splice(index, 1);
        }
      };
    },
    getElementById(id) {
      return id === "app" ? app : null;
    },
    querySelectorAll(selector) {
      return selector === 'link[rel~="icon"]' ? [icon] : [];
    }
  };
  const previousDocument = global.document;
  global.document = documentStub;

  try {
    const bossKeyApi = require("../src/content/boss-key.js");
    bossKeyApi.show("vscode");

    assert.equal(documentStub.title, "operations-dashboard - Visual Studio Code");
    assert.match(iconAttributes.get("href"), /^data:image\/svg\+xml,/);
    assert.match(bodyChildren[0].innerHTML, /wa-boss-comms/);
    assert.match(bodyChildren[0].innerHTML, /forecast\.js/);
    assert.equal(app.style.visibility, "hidden");

    bossKeyApi.hide();
    assert.equal(documentStub.title, "WhatsApp");
    assert.equal(iconAttributes.get("href"), "original.ico");
    assert.equal(app.style.visibility, "visible");
  } finally {
    global.document = previousDocument;
  }
});

test("boss key reads cached messages and relays replies", async () => {
  const listeners = new Map();
  const select = {
    value: "",
    disabled: false,
    innerHTML: "",
    addEventListener(type, listener) {
      listeners.set("select:" + type, listener);
    }
  };
  const form = {
    addEventListener(type, listener) {
      listeners.set("form:" + type, listener);
    }
  };
  const input = {
    value: "status received",
    disabled: false,
    placeholder: "",
    focus() {}
  };
  const button = { disabled: false };
  const status = { textContent: "" };
  const messages = { innerHTML: "", scrollTop: 0, scrollHeight: 100 };
  const elements = new Map([
    ["#wa-boss-chat-select", select],
    ["#wa-boss-comms-form", form],
    ["#wa-boss-comms-input", input],
    ['#wa-boss-comms-form button[type="submit"]', button],
    ["#wa-boss-comms-status", status],
    ["#wa-boss-comms-messages", messages]
  ]);
  const overlay = {
    className: "",
    id: "",
    innerHTML: "",
    querySelector(selector) {
      return elements.get(selector) || null;
    },
    remove() {}
  };
  const app = { style: { visibility: "" } };
  const sentMessages = [];
  const storedValues = [];
  const documentStub = {
    title: "WhatsApp",
    body: { appendChild() {} },
    head: { appendChild() {} },
    createElement(tagName) {
      if (tagName === "div") return overlay;
      return {
        setAttribute() {},
        remove() {}
      };
    },
    getElementById(id) {
      return id === "app" ? app : null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const chromeStub = {
    runtime: {
      async sendMessage(message) {
        sentMessages.push(message);
        return { ok: true };
      }
    },
    storage: {
      local: {
        async get() {
          return {
            waBookmarkBarData: {
              chats: [{ id: "chat-1", name: "Alice", hasUnread: true }],
              messagesByChatId: {
                "chat-1": [
                  { id: "m1", text: "Can you confirm?", direction: "incoming" }
                ]
              }
            }
          };
        },
        async set(value) {
          storedValues.push(value);
        }
      },
      onChanged: {
        addListener() {},
        removeListener() {}
      }
    }
  };
  const previousDocument = global.document;
  const previousChrome = global.chrome;
  global.document = documentStub;
  global.chrome = chromeStub;

  try {
    const bossKeyApi = require("../src/content/boss-key.js");
    bossKeyApi.show("spreadsheet");
    await new Promise((resolve) => setImmediate(resolve));

    assert.match(select.innerHTML, /Alice/);
    assert.match(messages.innerHTML, /Can you confirm\?/);

    await listeners.get("form:submit")({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(sentMessages, [
      {
        type: "BOOKMARK_BAR_SEND",
        chatId: "chat-1",
        chatName: "Alice",
        text: "status received"
      }
    ]);
    assert.equal(storedValues.length, 1);
    assert.match(messages.innerHTML, /status received/);
    bossKeyApi.hide();
  } finally {
    global.document = previousDocument;
    global.chrome = previousChrome;
  }
});

test("morse code supports digits and non-Latin contact names", () => {
  assert.equal(morseApi.textToMorse("A1"), ".- .----");
  assert.equal(
    morseApi.textToMorse("皮皮"),
    "--... -.... .- . --... -.... .- ."
  );
});

test("dashboard summarizes cached chats and messages", () => {
  const summary = dashboardApi.summarizeBookmarkData({
    chats: [
      { id: "chat-1", name: "Alice", hasUnread: true },
      { id: "chat-2", name: "Bob", hasUnread: false }
    ],
    messagesByChatId: {
      "chat-1": [
        { id: "m1", text: "Hello 😀", direction: "incoming" },
        { id: "m2", text: "Hi", direction: "outgoing" }
      ],
      "chat-2": [{ id: "m3", text: "Update 😀", direction: "incoming" }]
    },
    updatedAt: 123
  });

  assert.deepEqual(summary, {
    totalMessages: 3,
    incomingMessages: 2,
    outgoingMessages: 1,
    activeChats: 2,
    unreadChats: 1,
    topContact: "Alice",
    topContactMessages: 2,
    topEmoji: "😀",
    topEmojiCount: 2,
    updatedAt: 123
  });
});

test("dashboard finds only newly cached incoming messages", () => {
  const previous = {
    chats: [{ id: "chat-1", name: "Alice" }],
    messagesByChatId: {
      "chat-1": [{ id: "m1", text: "old", direction: "incoming" }]
    }
  };
  const next = {
    chats: [{ id: "chat-1", name: "Alice" }],
    messagesByChatId: {
      "chat-1": [
        { id: "m1", text: "old", direction: "incoming" },
        { id: "m2", text: "reply", direction: "outgoing" },
        { id: "m3", text: "new", direction: "incoming" }
      ]
    }
  };

  assert.deepEqual(dashboardApi.getNewIncomingMessages(previous, next), [
    {
      chatId: "chat-1",
      contactName: "Alice",
      message: { id: "m3", text: "new", direction: "incoming" }
    }
  ]);
});

test("dashboard ignores messages when a chat cache is observed for the first time", () => {
  const previous = {
    chats: [],
    messagesByChatId: {}
  };
  const next = {
    chats: [{ id: "chat-1", name: "Alice" }],
    messagesByChatId: {
      "chat-1": [{ id: "m1", text: "existing history", direction: "incoming" }]
    }
  };

  assert.deepEqual(dashboardApi.getNewIncomingMessages(previous, next), []);
});

test("dashboard detects new incoming messages when WhatsApp changes chat ids", () => {
  const previous = {
    chats: [{ id: "old-row-id", name: "Alice" }],
    messagesByChatId: {
      "old-row-id": [{ id: "m1", text: "old", direction: "incoming" }]
    }
  };
  const next = {
    chats: [{ id: "new-row-id", name: "Alice" }],
    messagesByChatId: {
      "new-row-id": [
        { id: "m1", text: "old", direction: "incoming" },
        { id: "m2", text: "new", direction: "incoming" }
      ]
    }
  };

  assert.deepEqual(dashboardApi.getNewIncomingMessages(previous, next), [
    {
      chatId: "new-row-id",
      contactName: "Alice",
      message: { id: "m2", text: "new", direction: "incoming" }
    }
  ]);
});

test("boss key restores the page visibility it replaced", () => {
  const app = { style: { visibility: "collapse" } };
  const bodyChildren = [];
  const documentStub = {
    body: {
      appendChild(node) {
        bodyChildren.push(node);
      }
    },
    createElement() {
      return {
        className: "",
        id: "",
        innerHTML: "",
        remove() {
          const index = bodyChildren.indexOf(this);
          if (index >= 0) {
            bodyChildren.splice(index, 1);
          }
        }
      };
    },
    getElementById(id) {
      return id === "app" ? app : null;
    }
  };
  const previousDocument = global.document;
  global.document = documentStub;

  try {
    const bossKeyApi = require("../src/content/boss-key.js");
    bossKeyApi.show("terminal");
    assert.equal(app.style.visibility, "hidden");
    bossKeyApi.hide();
    assert.equal(app.style.visibility, "collapse");
  } finally {
    global.document = previousDocument;
  }
});

test("fake meeting clears the previous auto-close timer before regenerating", async () => {
  const timers = new Map();
  let nextTimerId = 1;
  const clearedTimers = [];
  const bodyChildren = [];
  const documentStub = {
    body: {
      appendChild(node) {
        bodyChildren.push(node);
      }
    },
    createElement() {
      const listeners = new Map();
      return {
        className: "",
        id: "",
        innerHTML: "",
        addEventListener(type, listener) {
          listeners.set(type, listener);
        },
        remove() {
          const index = bodyChildren.indexOf(this);
          if (index >= 0) {
            bodyChildren.splice(index, 1);
          }
        }
      };
    }
  };
  const previousDocument = global.document;
  const previousSetTimeout = global.setTimeout;
  const previousClearTimeout = global.clearTimeout;
  global.document = documentStub;
  global.setTimeout = function (callback) {
    const id = nextTimerId++;
    timers.set(id, callback);
    return id;
  };
  global.clearTimeout = function (id) {
    clearedTimers.push(id);
    timers.delete(id);
  };

  try {
    const fakeMeetingApi = require("../src/content/fake-meeting.js");
    await fakeMeetingApi.generateMeeting("calendar", "First", "10:00");
    await fakeMeetingApi.generateMeeting("zoom", "Second", "10:15");

    assert.deepEqual(clearedTimers, [1]);
    assert.equal(bodyChildren.length, 1);
  } finally {
    global.document = previousDocument;
    global.setTimeout = previousSetTimeout;
    global.clearTimeout = previousClearTimeout;
  }
});

test("fake meeting never uses cached private messages as its default title", async () => {
  const bodyChildren = [];
  const documentStub = {
    body: {
      appendChild(node) {
        bodyChildren.push(node);
      }
    },
    createElement() {
      return {
        className: "",
        id: "",
        innerHTML: "",
        addEventListener() {},
        remove() {}
      };
    }
  };
  const previousDocument = global.document;
  const previousChrome = global.chrome;
  const previousSetTimeout = global.setTimeout;
  const previousClearTimeout = global.clearTimeout;
  global.document = documentStub;
  global.chrome = {
    storage: {
      local: {
        async get() {
          return {
            waBookmarkBarData: {
              chats: [{ id: "chat-1", name: "Alice" }],
              messagesByChatId: {
                "chat-1": [{ text: "Confidential acquisition details" }]
              }
            }
          };
        }
      }
    }
  };
  global.setTimeout = function () {
    return 1;
  };
  global.clearTimeout = function () {};

  try {
    delete require.cache[require.resolve("../src/content/fake-meeting.js")];
    const fakeMeetingApi = require("../src/content/fake-meeting.js");
    await fakeMeetingApi.generateMeeting("calendar");

    assert.equal(bodyChildren[0].innerHTML.includes("Confidential acquisition details"), false);
    assert.equal(bodyChildren[0].innerHTML.includes("Team Sync"), true);
  } finally {
    global.document = previousDocument;
    global.chrome = previousChrome;
    global.setTimeout = previousSetTimeout;
    global.clearTimeout = previousClearTimeout;
  }
});

test("danmu listens for cache changes and renders new incoming messages", async () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "content", "danmu.js"),
    "utf8"
  );
  const storageListeners = [];
  const bodyChildren = [];

  function createElement() {
    const listeners = new Map();
    return {
      id: "",
      className: "",
      textContent: "",
      innerHTML: "",
      style: {},
      children: [],
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      appendChild(child) {
        this.children.push(child);
      },
      remove() {
        const index = bodyChildren.indexOf(this);
        if (index >= 0) {
          bodyChildren.splice(index, 1);
        }
      }
    };
  }

  const context = {
    globalThis: null,
    document: {
      body: {
        appendChild(node) {
          bodyChildren.push(node);
        }
      },
      createElement
    },
    chrome: {
      storage: {
        local: {
          async get() {
            return {
              waPrivacyBlurSettings: {
                danmuModeEnabled: true,
                danmuSpeed: "fast"
              }
            };
          }
        },
        onChanged: {
          addListener(listener) {
            storageListeners.push(listener);
          }
        }
      }
    },
    WhatsAppBlurDashboardData: dashboardApi,
    Math,
    Object
  };
  context.globalThis = context;

  vm.runInNewContext(source, context, { filename: "danmu.js" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(bodyChildren.length, 1);
  assert.equal(storageListeners.length, 1);

  storageListeners[0](
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

  assert.equal(bodyChildren[0].children.length, 1);
  assert.equal(bodyChildren[0].children[0].textContent, "Alice: hello");
  assert.equal(bodyChildren[0].children[0].style.animationDuration, "5s");
});

test("danmu renders incoming event batches with fallback text across lanes", async () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "content", "danmu.js"),
    "utf8"
  );
  const storageListeners = [];
  const bodyChildren = [];

  function createElement() {
    const listeners = new Map();
    return {
      id: "",
      className: "",
      textContent: "",
      innerHTML: "",
      style: {},
      children: [],
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      appendChild(child) {
        this.children.push(child);
      },
      remove() {
        const index = bodyChildren.indexOf(this);
        if (index >= 0) {
          bodyChildren.splice(index, 1);
        }
      }
    };
  }

  const context = {
    globalThis: null,
    document: {
      body: {
        appendChild(node) {
          bodyChildren.push(node);
        }
      },
      createElement
    },
    chrome: {
      storage: {
        local: {
          async get() {
            return {
              waPrivacyBlurSettings: {
                danmuModeEnabled: true,
                danmuSpeed: "normal"
              }
            };
          }
        },
        onChanged: {
          addListener(listener) {
            storageListeners.push(listener);
          }
        }
      }
    },
    WhatsAppBookmarkData: require("../src/shared/bookmark-data.js"),
    WhatsAppBlurDashboardData: dashboardApi,
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
    Math,
    Object
  };
  context.globalThis = context;

  vm.runInNewContext(source, context, { filename: "danmu.js" });
  await new Promise((resolve) => setImmediate(resolve));

  storageListeners[0](
    {
      waIncomingMessageEvents: {
        oldValue: {
          id: "batch-old",
          entries: [{ eventId: "old-event" }]
        },
        newValue: {
          id: "batch-new",
          entries: [
            {
              eventId: "event-1",
              chatId: "chat-1",
              contactName: "Alice",
              text: "",
              source: "message",
              message: { kind: "image", fallbackText: "Photo" }
            },
            {
              eventId: "event-2",
              chatId: "chat-2",
              contactName: "Bob",
              text: "hello",
              source: "message"
            }
          ]
        }
      }
    },
    "local"
  );

  assert.equal(bodyChildren[0].children.length, 2);
  assert.equal(bodyChildren[0].children[0].textContent, "Alice: Photo");
  assert.equal(bodyChildren[0].children[1].textContent, "Bob: hello");
  assert.notEqual(bodyChildren[0].children[0].style.top, bodyChildren[0].children[1].style.top);
});
