const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const settingsApi = require("../src/shared/settings.js");
const runtimeApi = require("../src/shared/runtime.js");
const selectorsApi = require("../src/content/selectors.js");
const filteringApi = require("../src/content/filtering.js");

const contentScriptSource = fs.readFileSync(
  path.join(__dirname, "..", "content.js"),
  "utf8"
);

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  toggle(name, force) {
    if (force === undefined) {
      if (this.values.has(name)) {
        this.values.delete(name);
        return false;
      }

      this.values.add(name);
      return true;
    }

    if (force) {
      this.values.add(name);
      return true;
    }

    this.values.delete(name);
    return false;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeNode {
  constructor(matchSelectors) {
    this.parentElement = null;
    this.children = [];
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.matchSelectors = new Set(matchSelectors || []);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  contains(node) {
    let current = node;

    while (current) {
      if (current === this) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  closest(selector) {
    let current = this;

    while (current) {
      if (current.matchSelectors.has(selector)) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeNode();
    this.body = new FakeNode();
    this.documentElement.appendChild(this.body);
    this.selectorMap = new Map();
    this.nodes = new Set([this.documentElement, this.body]);
    this.listeners = new Map();
  }

  register(selector, nodes) {
    this.selectorMap.set(selector, nodes);
    nodes.forEach((node) => this.nodes.add(node));
  }

  querySelectorAll(selector) {
    if (selector === `[${selectorsApi.MANAGED_ATTRIBUTE}="true"]`) {
      return Array.from(this.nodes).filter(
        (node) => node.getAttribute(selectorsApi.MANAGED_ATTRIBUTE) === "true"
      );
    }

    return this.selectorMap.get(selector) || [];
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    this.listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }

    this.listeners.set(
      type,
      listeners.filter((entry) => entry !== listener)
    );
  }

  dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    listeners.slice().forEach((listener) => listener(event));
  }
}

function createHarness(storedSettings, options = {}) {
  const document = new FakeDocument();
  const selectors = options.selectors || selectorsApi;
  const messageListeners = [];
  const timers = new Map();
  let nextTimerId = 1;
  const windowListeners = new Map();
  const bossKeyCalls = [];
  const fakeMeetingCalls = [];
  let bossKeyActive = false;
  let fakeMeetingActive = false;

  function setTimeoutStub(callback) {
    const timerId = nextTimerId;
    nextTimerId += 1;
    timers.set(timerId, callback);
    return timerId;
  }

  function clearTimeoutStub(timerId) {
    timers.delete(timerId);
  }

  function addListener(map, type, listener) {
    if (!map.has(type)) {
      map.set(type, []);
    }

    map.get(type).push(listener);
  }

  function removeListener(map, type, listener) {
    const listeners = map.get(type);
    if (!listeners) {
      return;
    }

    map.set(
      type,
      listeners.filter((entry) => entry !== listener)
    );
  }

  function dispatchFromMap(map, event) {
    const listeners = map.get(event.type) || [];
    listeners.slice().forEach((listener) => listener(event));
  }

  const context = {
    document,
    window: null,
    console,
    Date,
    MutationObserver: class {
      constructor(callback) {
        this.callback = callback;
      }

      observe() {}

      disconnect() {}
    },
    chrome: {
      storage: {
        local: {
          get: async function () {
            return {
              [settingsApi.STORAGE_KEY]: storedSettings
            };
          }
        }
      },
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListeners.push(listener);
          }
        }
      }
    },
    WhatsAppBlurSettings: settingsApi,
    WhatsAppBlurRuntime: runtimeApi,
    WhatsAppBlurSelectors: selectors,
    WhatsAppBlurFiltering: filteringApi,
    WhatsAppBlurBossKey: {
      toggle(theme) {
        bossKeyCalls.push(theme);
        bossKeyActive = !bossKeyActive;
      },
      getActive() {
        return bossKeyActive;
      },
      hide() {
        bossKeyCalls.push("hide");
        bossKeyActive = false;
      }
    },
    WhatsAppBlurFakeMeeting: {
      generateMeeting(template) {
        fakeMeetingCalls.push(template);
        fakeMeetingActive = true;
      },
      closeMeeting() {
        if (fakeMeetingActive) {
          fakeMeetingCalls.push("close");
        }
        fakeMeetingActive = false;
      }
    },
    setTimeout: setTimeoutStub,
    clearTimeout: clearTimeoutStub,
    addEventListener(type, listener) {
      addListener(windowListeners, type, listener);
    },
    removeEventListener(type, listener) {
      removeListener(windowListeners, type, listener);
    },
    dispatchEvent(event) {
      dispatchFromMap(windowListeners, event);
    }
  };

  document.dispatchKey = function dispatchKey(type, init) {
    const event = Object.assign({ type }, init);
    document.dispatchEvent(event);
    context.dispatchEvent(event);
  };

  context.window = context;

  return {
    document,
    messageListeners,
    bossKeyCalls,
    fakeMeetingCalls,
    runTimers: function runTimers() {
      while (timers.size > 0) {
        const callbacks = Array.from(timers.entries());
        timers.clear();
        callbacks.forEach(([, callback]) => callback());
      }
    },
    run: async function () {
      vm.runInNewContext(contentScriptSource, context, {
        filename: "content.js"
      });

      await new Promise((resolve) => setImmediate(resolve));
    }
  };
}

test("content controller keeps only the deepest managed node for overlapping matches", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: true,
      chatText: false,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      otherUi: false
    }
  });

  const titleNode = harness.document.body.appendChild(new FakeNode());
  const titleTextNode = titleNode.appendChild(new FakeNode());

  harness.document.register('#pane-side [data-testid="cell-frame-title"]', [titleNode]);
  harness.document.register('#pane-side [data-testid="cell-frame-title"] span[dir="auto"]', [
    titleTextNode
  ]);

  await harness.run();

  assert.equal(titleNode.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
  assert.equal(titleTextNode.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(titleTextNode.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "contactList");
});

test("content controller promotes voice-message internals to the enclosing message card", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: false,
      chatText: false,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: true,
      otherUi: false
    }
  });

  const messageCard = harness.document.body.appendChild(
    new FakeNode(['[data-testid="msg-container"]'])
  );
  const audioInner = messageCard.appendChild(new FakeNode());

  harness.document.register('#main [data-testid="msg-container"] [data-testid*="audio"]', [
    audioInner
  ]);
  harness.document.register('#main [data-testid="msg-container"] [data-testid="ptt-status-icon"]', []);
  harness.document.register('#main [data-testid="msg-container"] [role="slider"]', []);

  await harness.run();

  assert.equal(audioInner.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
  assert.equal(messageCard.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(messageCard.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "voiceMessages");
});


test("content controller promotes chat-text span matches to the copyable-text container", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: false,
      chatText: true,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      otherUi: false
    }
  });

  const msgContainer = harness.document.body.appendChild(
    new FakeNode(['[data-testid="msg-container"]'])
  );
  const copyableText = msgContainer.appendChild(
    new FakeNode(['.copyable-text', 'div.copyable-text'])
  );
  const textSpan = copyableText.appendChild(
    new FakeNode(['span.selectable-text'])
  );

  harness.document.register(
    '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] span.selectable-text',
    [textSpan]
  );

  await harness.run();

  assert.equal(textSpan.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
  assert.equal(copyableText.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(copyableText.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "chatText");
});

test("content controller promotes chat-text div matches to the copyable-text container for emoji-bearing messages", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: false,
      chatText: true,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      otherUi: false
    }
  });

  const msgContainer = harness.document.body.appendChild(
    new FakeNode(['[data-testid="msg-container"]'])
  );
  const copyableText = msgContainer.appendChild(
    new FakeNode(['.copyable-text', 'div.copyable-text'])
  );
  const textDiv = copyableText.appendChild(
    new FakeNode(['div.selectable-text'])
  );

  harness.document.register(
    '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] div.selectable-text',
    [textDiv]
  );

  await harness.run();

  assert.equal(textDiv.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
  assert.equal(copyableText.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(copyableText.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "chatText");
});

test("content controller reveals blurred content while Alt is held down", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: false,
    holdRevealEnabled: true,
    blurTargets: {
      contactList: true,
      chatText: false,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      otherUi: false
    }
  });

  const titleNode = harness.document.body.appendChild(new FakeNode());
  harness.document.register('#pane-side [data-testid="cell-frame-title"]', [titleNode]);

  await harness.run();
  assert.equal(harness.document.documentElement.classList.contains(selectorsApi.HOLD_REVEAL_CLASS), false);

  harness.document.dispatchKey("keydown", { key: "Alt" });
  assert.equal(harness.document.documentElement.classList.contains(selectorsApi.HOLD_REVEAL_CLASS), true);

  harness.document.dispatchKey("keyup", { key: "Alt" });
  assert.equal(harness.document.documentElement.classList.contains(selectorsApi.HOLD_REVEAL_CLASS), false);
});

test("content controller temporarily hides everything on emergency hide", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    holdRevealEnabled: false,
    blurTargets: {
      contactList: true,
      chatText: false,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      otherUi: false
    }
  });

  const chatTextNode = harness.document.body.appendChild(new FakeNode());
  harness.document.register(
    '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] span.selectable-text',
    [chatTextNode]
  );

  await harness.run();
  assert.equal(chatTextNode.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);

  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.hideAllTemporarily,
    durationMs: 5000
  });

  assert.equal(chatTextNode.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");

  harness.runTimers();
  assert.equal(chatTextNode.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
});

test("content controller applies and replaces cinematic blur styles", async () => {
  const harness = createHarness({
    enabled: true,
    cinematicBlurEnabled: true,
    cinematicBlurStyle: "matrix",
    blurTargets: {
      contactList: true,
      chatText: false,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      timestamps: false,
      otherUi: false
    }
  });

  const titleNode = harness.document.body.appendChild(new FakeNode());
  harness.document.register('#pane-side [data-testid="cell-frame-title"]', [titleNode]);

  await harness.run();

  assert.equal(titleNode.classList.contains("wa-blur-ext--cinematic-matrix"), true);

  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.applySettings,
    settings: {
      enabled: true,
      cinematicBlurEnabled: true,
      cinematicBlurStyle: "noise",
      blurTargets: {
        contactList: true,
        chatText: false,
        avatars: false,
        previewText: false,
        mediaPreviews: false,
        voiceMessages: false,
        timestamps: false,
        otherUi: false
      }
    }
  });

  assert.equal(titleNode.classList.contains("wa-blur-ext--cinematic-matrix"), false);
  assert.equal(titleNode.classList.contains("wa-blur-ext--cinematic-noise"), true);
});

test("content controller gates boss key and fake meeting actions behind settings", async () => {
  const harness = createHarness({
    enabled: true,
    bossKeyEnabled: false,
    bossKeyTheme: "terminal",
    fakeMeetingEnabled: false,
    fakeMeetingTemplate: "zoom"
  });

  await harness.run();

  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.bossKeyToggle
  });
  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.fakeMeetingGenerate
  });

  assert.deepEqual(harness.bossKeyCalls, []);
  assert.deepEqual(harness.fakeMeetingCalls, []);

  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.applySettings,
    settings: {
      enabled: true,
      bossKeyEnabled: true,
      bossKeyTheme: "terminal",
      fakeMeetingEnabled: true,
      fakeMeetingTemplate: "zoom"
    }
  });
  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.bossKeyToggle
  });
  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.fakeMeetingGenerate
  });

  assert.deepEqual(harness.bossKeyCalls, ["terminal"]);
  assert.deepEqual(harness.fakeMeetingCalls, ["zoom"]);
});

test("read receipt setting only hides local receipt indicators", async () => {
  const harness = createHarness({
    enabled: true,
    readReceiptProtectionEnabled: true
  });

  await harness.run();

  assert.equal(
    harness.document.documentElement.classList.contains(
      "wa-blur-ext--read-receipt-protection"
    ),
    true
  );
});

test("disabling boss key and fake meeting closes active overlays", async () => {
  const harness = createHarness({
    enabled: true,
    bossKeyEnabled: true,
    bossKeyTheme: "spreadsheet",
    fakeMeetingEnabled: true,
    fakeMeetingTemplate: "calendar"
  });

  await harness.run();
  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.bossKeyToggle
  });
  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.fakeMeetingGenerate
  });

  await harness.messageListeners[0]({
    type: runtimeApi.MESSAGE_TYPES.applySettings,
    settings: {
      enabled: true,
      bossKeyEnabled: false,
      fakeMeetingEnabled: false
    }
  });

  assert.deepEqual(harness.bossKeyCalls, ["spreadsheet", "hide"]);
  assert.deepEqual(harness.fakeMeetingCalls, ["calendar", "close"]);
});


test("content controller blurs chat-text author names outside copyable-text", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: false,
      chatText: true,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      otherUi: false
    }
  });

  const msgContainer = harness.document.body.appendChild(
    new FakeNode(['[data-testid="msg-container"]'])
  );
  const authorSpan = msgContainer.appendChild(
    new FakeNode(['[data-testid="author"]'])
  );

  harness.document.register(
    '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] [data-testid="author"]',
    [authorSpan]
  );

  await harness.run();

  assert.equal(authorSpan.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(authorSpan.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "chatText");
});

test("content controller allows different targets to nest without skipping ancestors", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: false,
      chatText: true,
      avatars: false,
      previewText: false,
      mediaPreviews: true,
      voiceMessages: false,
      otherUi: false
    }
  });

  const msgContainer = harness.document.body.appendChild(
    new FakeNode(['[data-testid="msg-container"]'])
  );
  const copyableText = msgContainer.appendChild(
    new FakeNode(['.copyable-text', 'div.copyable-text'])
  );
  const textSpan = copyableText.appendChild(
    new FakeNode(['span.selectable-text'])
  );
  const emojiImg = copyableText.appendChild(
    new FakeNode([])
  );

  harness.document.register(
    '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] span.selectable-text',
    [textSpan]
  );
  harness.document.register(
    '#main [data-testid="msg-container"] img',
    [emojiImg]
  );

  await harness.run();

  assert.equal(copyableText.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(copyableText.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "chatText");
  assert.equal(emojiImg.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(emojiImg.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "mediaPreviews");
});

test("content controller blurs document attachment cards as media previews", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: false,
      chatText: false,
      avatars: false,
      previewText: false,
      mediaPreviews: true,
      voiceMessages: false,
      otherUi: false
    }
  });

  const documentCard = harness.document.body.appendChild(
    new FakeNode(['div[role="button"][tabindex="0"]:has(span[data-icon*="document"])'])
  );

  harness.document.register(
    '#main [data-testid="msg-container"] div[role="button"][tabindex="0"]:has(span[data-icon*="document"])',
    [documentCard]
  );

  await harness.run();

  assert.equal(documentCard.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), "true");
  assert.equal(documentCard.getAttribute(selectorsApi.TARGET_ATTRIBUTE), "mediaPreviews");
});

test("content controller skips blur candidates inside desktop pet host/children", async () => {
  const harness = createHarness({
    enabled: true,
    hoverReveal: true,
    blurTargets: {
      contactList: false,
      chatText: true,
      avatars: false,
      previewText: false,
      mediaPreviews: false,
      voiceMessages: false,
      otherUi: false
    }
  });

  const desktopPetHost = harness.document.body.appendChild(
    new FakeNode(["#wa-desktop-pet-root", ".wa-desktop-pet-root"])
  );
  const msgContainer = desktopPetHost.appendChild(
    new FakeNode(["[data-testid='msg-container']"])
  );
  const copyableText = msgContainer.appendChild(new FakeNode(["div.copyable-text"]));
  const textSpan = copyableText.appendChild(new FakeNode(["span[dir=\"ltr\"]"]));

  harness.document.register(
    '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] div.copyable-text span[dir="ltr"]',
    [textSpan]
  );

  await harness.run();

  assert.equal(copyableText.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
  assert.equal(copyableText.getAttribute(selectorsApi.TARGET_ATTRIBUTE), null);
});

test("content controller still skips bookmark bar through shared overlay list fallback", async () => {
  const legacySelectors = Object.assign({}, selectorsApi, {
    OVERLAY_EXCLUDE_SELECTORS: undefined
  });
  const harness = createHarness(
    {
      enabled: true,
      hoverReveal: true,
      blurTargets: {
        contactList: false,
        chatText: true,
        avatars: false,
        previewText: false,
        mediaPreviews: false,
        voiceMessages: false,
        otherUi: false
      }
    },
    {
      selectors: legacySelectors
    }
  );

  const bookmarkRoot = harness.document.body.appendChild(new FakeNode(["#wa-bookmark-bar"]));
  const bookmarkMsgContainer = bookmarkRoot.appendChild(new FakeNode(["[data-testid='msg-container']"]));
  const bookmarkCopyableText = bookmarkMsgContainer.appendChild(new FakeNode(["div.copyable-text"]));
  const bookmarkTextSpan = bookmarkCopyableText.appendChild(new FakeNode(["span[dir=\"ltr\"]"]));

  const petRoot = harness.document.body.appendChild(new FakeNode(["#wa-desktop-pet-root"]));
  const petMsgContainer = petRoot.appendChild(new FakeNode(["[data-testid='msg-container']"]));
  const petCopyableText = petMsgContainer.appendChild(new FakeNode(["div.copyable-text"]));
  const petTextSpan = petCopyableText.appendChild(new FakeNode(["span[dir=\"ltr\"]"]));

  harness.document.register(
    '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] div.copyable-text span[dir="ltr"]',
    [bookmarkTextSpan, petTextSpan]
  );

  await harness.run();

  assert.equal(bookmarkCopyableText.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
  assert.equal(bookmarkCopyableText.getAttribute(selectorsApi.TARGET_ATTRIBUTE), null);
  assert.equal(petCopyableText.getAttribute(selectorsApi.MANAGED_ATTRIBUTE), null);
  assert.equal(petCopyableText.getAttribute(selectorsApi.TARGET_ATTRIBUTE), null);
});
