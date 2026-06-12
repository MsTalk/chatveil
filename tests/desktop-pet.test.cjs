const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const desktopPetSource = fs.readFileSync(
  path.join(__dirname, "..", "src/content/desktop-pet.js"),
  "utf8"
);
const settingsApi = require("../src/shared/settings.js");
const runtimeApi = require("../src/shared/runtime.js");

const SETTINGS_KEY = "waPrivacyBlurSettings";

test("desktop pet overlay mounts with shadow root and reflects settings", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "interactive",
    desktopPetCorner: "top-left",
    desktopPetSize: "large",
    desktopPetColor: "#6EC6FF",
    desktopPetHidden: false
  });
  await flushAsync();

  const pet = harness.context.WhatsAppDesktopPet.getHost();
  const host = pet;

  assert.equal(host.id, "wa-desktop-pet-root");
  assert.equal(host.classList.contains("wa-desktop-pet-root"), true);
  assert.equal(host.getAttribute("data-mode"), "interactive");
  assert.equal(host.getAttribute("data-corner"), "top-left");
  assert.equal(host.getAttribute("data-size"), "large");
  assert.equal(host.getAttribute("data-color"), "#6ec6ff");
  assert.equal(host.style["--wa-desktop-pet-fur"], "#6ec6ff");
  assert.equal(host.getAttribute("data-mood"), "idle");
  assert.equal(Boolean(host.shadowRoot), true);
  assert.equal(host.shadowRoot.children.some((node) => node.className === "wa-desktop-pet-wrap"), true);
});

test("desktop pet shadow DOM renders a recognizable animated pixel cat", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "hybrid",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();

  const host = harness.context.WhatsAppDesktopPet.getHost();
  const shadowRoot = host.shadowRoot;
  const styleNode = shadowRoot.children.find((node) => node.tagName === "style");
  const styleText = styleNode ? styleNode.textContent : "";

  assert.equal(Boolean(shadowRoot.querySelector(".wa-desktop-pet-ear--left")), true);
  assert.equal(Boolean(shadowRoot.querySelector(".wa-desktop-pet-ear--right")), true);
  assert.equal(Boolean(shadowRoot.querySelector(".wa-desktop-pet-eye--left")), true);
  assert.equal(Boolean(shadowRoot.querySelector(".wa-desktop-pet-eye--right")), true);
  assert.equal(Boolean(shadowRoot.querySelector(".wa-desktop-pet-muzzle")), true);
  assert.equal(Boolean(shadowRoot.querySelector(".wa-desktop-pet-tail")), true);
  assert.equal(shadowRoot.querySelector(".wa-desktop-pet-eye--left").parentElement, shadowRoot.querySelector(".wa-desktop-pet-pixel-cat"));
  assert.equal(shadowRoot.querySelector(".wa-desktop-pet-whisker--left").parentElement, shadowRoot.querySelector(".wa-desktop-pet-pixel-cat"));
  assert.equal(shadowRoot.querySelector(".wa-desktop-pet-whisker--right").parentElement, shadowRoot.querySelector(".wa-desktop-pet-pixel-cat"));
  assert.match(styleText, /var\(--wa-desktop-pet-fur/);
  assert.match(styleText, /:host\(\[data-mood="preview"\]\)/);
  assert.match(styleText, /:host\(\[data-mood="reactive"\]\)/);
  assert.match(styleText, /:host\(\[data-mood="interactive"\]\)/);
  assert.match(styleText, /@keyframes wa-desktop-pet-bounce/);
});

test("hidden state adds class and aria-hidden attribute", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "reactive",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: true
  });
  await flushAsync();

  const host = harness.context.WhatsAppDesktopPet.getHost();

  assert.equal(host.classList.contains("is-hidden"), true);
  assert.equal(host.getAttribute("aria-hidden"), "true");
});

test("hybrid mode reacts to document visibilitychange", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "hybrid",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();

  const host = harness.context.WhatsAppDesktopPet.getHost();
  assert.equal(host.getAttribute("data-mood"), "idle");

  harness.context.document.visibilityState = "hidden";
  harness.context.document.dispatchEvent({
    type: "visibilitychange"
  });
  assert.equal(host.getAttribute("data-mood"), "reactive");

  await sleep(560);
  assert.equal(host.getAttribute("data-mood"), "idle");
});

test("reactive mode reacts to storage incoming message events", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "reactive",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();

  const host = harness.context.WhatsAppDesktopPet.getHost();
  assert.equal(host.getAttribute("data-mood"), "idle");

  harness.storageChangeCallbacks[0](
    {
      waIncomingMessageEvents: {
        newValue: {
          entries: [{ eventId: "evt-1" }]
        },
        oldValue: {
          entries: []
        }
      }
    },
    "local"
  );

  assert.equal(host.getAttribute("data-mood"), "reactive");
});

test("reactive mode observes WhatsApp unread DOM activity without bookmark bar storage events", async () => {
  const harness = createHarness(
    {
      desktopPetEnabled: true,
      desktopPetMode: "reactive",
      desktopPetCorner: "bottom-right",
      desktopPetSize: "medium",
      desktopPetHidden: false
    },
    {
      locationHostname: "web.whatsapp.com",
      enableMutationObserver: true
    }
  );
  await flushAsync();

  const host = harness.context.WhatsAppDesktopPet.getHost();
  assert.equal(host.getAttribute("data-mood"), "idle");

  const chatPane = harness.context.document.createElement("div");
  chatPane.id = "pane-side";
  harness.context.document.body.appendChild(chatPane);
  harness.triggerMutationObservers();
  await sleep(110);

  assert.equal(host.getAttribute("data-mood"), "idle");

  const unreadBadge = harness.context.document.createElement("span");
  unreadBadge.setAttribute("aria-label", "1 unread message");
  chatPane.appendChild(unreadBadge);
  harness.triggerMutationObservers();
  await sleep(110);

  assert.equal(host.getAttribute("data-mood"), "reactive");
});

test("hybrid mode reacts to bookmark-bar activity via dashboard data", async () => {
  const previousData = {
    chats: [{ id: "chat-1", name: "Alice" }],
    messagesByChatId: {
      "chat-1": [{ id: "old-1", direction: "incoming", isOutgoing: false }]
    }
  };
  const nextData = {
    chats: [{ id: "chat-1", name: "Alice" }],
    messagesByChatId: {
      "chat-1": [
        { id: "old-1", direction: "incoming", isOutgoing: false },
        { id: "new-1", direction: "incoming", isOutgoing: false }
      ]
    }
  };
  const receivedArgs = [];

  const dashHarness = createHarness(
    {
      desktopPetEnabled: true,
      desktopPetMode: "hybrid",
      desktopPetCorner: "bottom-right",
      desktopPetSize: "medium",
      desktopPetHidden: false
    },
    {
      dashboardData: {
        getNewIncomingMessages: function (previousRaw, nextRaw) {
          receivedArgs.push({ previousRaw, nextRaw });
          if (!previousRaw || !nextRaw) {
            return [];
          }

          const previousMessages = previousRaw.messagesByChatId || {};
          const nextMessages = nextRaw.messagesByChatId || {};
          const knownMessages = new Set(
            Object.prototype.hasOwnProperty.call(previousMessages, "chat-1")
              ? previousMessages["chat-1"].map((message) => message.id)
              : []
          );

          return (Object.keys(nextMessages).length > 0 &&
            (nextMessages["chat-1"] || []).filter((message) => {
              return message.direction === "incoming" && !knownMessages.has(message.id);
            }).length > 0
          )
            ? [{ conversationId: "chat-1" }]
            : [];
        }
      }
    }
  );
  await flushAsync();

  const host = dashHarness.context.WhatsAppDesktopPet.getHost();
  assert.equal(host.getAttribute("data-mood"), "idle");

  dashHarness.storageChangeCallbacks[0](
    {
      waBookmarkBarData: {
        newValue: nextData,
        oldValue: previousData
      }
    },
    "local"
  );

  assert.equal(host.getAttribute("data-mood"), "reactive");
  assert.equal(receivedArgs.length, 1);
  assert.equal(receivedArgs[0].previousRaw, previousData);
  assert.equal(receivedArgs[0].nextRaw, nextData);
});

test("quiet and interactive modes do not react to incoming message events", async () => {
  const quietHarness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "quiet",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();
  const quietHost = quietHarness.context.WhatsAppDesktopPet.getHost();

  quietHarness.storageChangeCallbacks[0](
    {
      waIncomingMessageEvents: {
        newValue: {
          entries: [{ id: "evt-1" }]
        },
        oldValue: {
          entries: []
        }
      }
    },
    "local"
  );
  assert.equal(quietHost.getAttribute("data-mood"), "idle");

  const interactiveHarness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "interactive",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();
  const interactiveHost = interactiveHarness.context.WhatsAppDesktopPet.getHost();

  interactiveHarness.storageChangeCallbacks[0](
    {
      waIncomingMessageEvents: {
        newValue: {
          entries: [{ id: "evt-1" }]
        },
        oldValue: {
          entries: []
        }
      }
    },
    "local"
  );
  assert.equal(interactiveHost.getAttribute("data-mood"), "idle");
});

test("disabled mode does not react to storage incoming message events", async () => {
  const harness = createHarness({
    desktopPetEnabled: false,
    desktopPetMode: "hybrid",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();

  assert.equal(harness.context.WhatsAppDesktopPet.getHost(), null);

  harness.storageChangeCallbacks[0](
    {
      waIncomingMessageEvents: {
        newValue: {
          entries: [{ id: "evt-1" }]
        },
        oldValue: {
          entries: []
        }
      }
    },
    "local"
  );

  assert.equal(harness.context.WhatsAppDesktopPet.getHost(), null);
});

test("preview temporarily shows hidden host without changing stored settings", async () => {
  const sourceSettings = {
    desktopPetEnabled: true,
    desktopPetMode: "interactive",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "small",
    desktopPetHidden: true
  };
  const harness = createHarness(sourceSettings);
  await flushAsync();

  const api = harness.context.WhatsAppDesktopPet;
  const host = api.getHost();
  assert.equal(host.classList.contains("is-hidden"), true);
  assert.equal(harness.storedSettings.desktopPetHidden, true);

  api.preview(30);

  assert.equal(host.getAttribute("data-mood"), "preview");
  assert.equal(host.classList.contains("is-hidden"), false);
  assert.equal(host.getAttribute("aria-hidden"), "false");

  await sleep(50);

  assert.equal(host.getAttribute("data-mood"), "idle");
  assert.equal(host.classList.contains("is-hidden"), true);
  assert.equal(host.getAttribute("aria-hidden"), "true");
  assert.equal(harness.storedSettings.desktopPetHidden, true);
});

test("storage updates mount, destroy, and re-mount overlay", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "interactive",
    desktopPetCorner: "top-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();

  const api = harness.context.WhatsAppDesktopPet;
  assert.equal(api.getHost()?.getAttribute("data-size"), "medium");
  assert.equal(api.getHost()?.getAttribute("data-corner"), "top-right");

  api.handleStorageChange(
    {
      [SETTINGS_KEY]: {
        newValue: {
          desktopPetEnabled: false
        }
      }
    },
    "local"
  );
  await flushAsync();
  assert.equal(api.getHost(), null);

  api.handleStorageChange(
    {
      [SETTINGS_KEY]: {
        newValue: {
          desktopPetEnabled: true,
          desktopPetMode: "hybrid",
          desktopPetCorner: "bottom-left",
          desktopPetSize: "small",
          desktopPetHidden: true
        }
      }
    },
    "local"
  );
  await flushAsync();

  const rehydrated = api.getHost();
  assert.equal(rehydrated.getAttribute("data-size"), "small");
  assert.equal(rehydrated.getAttribute("data-corner"), "bottom-left");
  assert.equal(rehydrated.classList.contains("is-hidden"), true);
  assert.equal(rehydrated.getAttribute("aria-hidden"), "true");
});

test("hidden preview stay visible during reactive pulses until preview timer expires", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "reactive",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: true
  });
  await flushAsync();

  const api = harness.context.WhatsAppDesktopPet;
  const host = api.getHost();
  assert.equal(host.classList.contains("is-hidden"), true);

  api.preview(30);
  assert.equal(host.classList.contains("is-hidden"), false);

  harness.storageChangeCallbacks[0](
    {
      waIncomingMessageEvents: {
        newValue: {
          entries: [
            {
              eventId: "preview-1",
              chatId: "chat-1",
              direction: "incoming"
            }
          ]
        },
        oldValue: {
          entries: []
        }
      }
    },
    "local"
  );

  assert.equal(host.classList.contains("is-hidden"), false);
  await sleep(15);
  assert.equal(host.classList.contains("is-hidden"), false);
  await sleep(30);
  assert.equal(host.classList.contains("is-hidden"), true);
});

test("disabled runtime preview does not recreate host after disable", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "interactive",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();

  const api = harness.context.WhatsAppDesktopPet;
  assert.equal(api.getHost()?.id, "wa-desktop-pet-root");

  api.handleStorageChange(
    {
      [SETTINGS_KEY]: {
        newValue: {
          desktopPetEnabled: false
        }
      }
    },
    "local"
  );
  await flushAsync();
  assert.equal(api.getHost(), null);

  harness.runtimeMessageCallbacks[0]({
    type: runtimeApi.MESSAGE_TYPES.desktopPetPreview,
    durationMs: 30
  });

  assert.equal(api.getHost(), null);
  assert.equal(api.preview(30), false);
  assert.equal(api.getHost(), null);
});

test("runtime preview message sets preview mood", async () => {
  const harness = createHarness({
    desktopPetEnabled: true,
    desktopPetMode: "hybrid",
    desktopPetCorner: "bottom-right",
    desktopPetSize: "medium",
    desktopPetHidden: false
  });
  await flushAsync();

  const api = harness.context.WhatsAppDesktopPet;
  const host = api.getHost();

  harness.runtimeMessageCallbacks[0]({
    type: runtimeApi.MESSAGE_TYPES.desktopPetPreview,
    durationMs: 30
  });

  assert.equal(host.getAttribute("data-mood"), "preview");
  await sleep(50);
  assert.equal(host.getAttribute("data-mood"), "idle");
});

function createHarness(initialSettings, options = {}) {
  const runtimeMessageCallbacks = [];
  const storageChangeCallbacks = [];
  const mutationObservers = [];
    const context = {
    console,
    setTimeout,
    clearTimeout,
    document: new FakeDocument(),
    window: null,
    chrome: {
      storage: {
        local: {
          async get(key) {
            if (key === SETTINGS_KEY) {
              return {
                [SETTINGS_KEY]: initialSettings
              };
            }

            return {};
          }
        },
        onChanged: {
          addListener(listener) {
            storageChangeCallbacks.push(listener);
          }
        }
      },
      runtime: {
        onMessage: {
          addListener(listener) {
            runtimeMessageCallbacks.push(listener);
          }
        }
      }
    },
    WhatsAppBlurSettings: settingsApi,
    WhatsAppBlurRuntime: runtimeApi,
    WhatsAppBlurDashboardData: options.dashboardData,
    location: {
      hostname: options.locationHostname || "example.com"
    }
  };

  if (options.enableMutationObserver) {
    context.MutationObserver = class FakeMutationObserver {
      constructor(callback) {
        this.callback = callback;
        this.connected = false;
        mutationObservers.push(this);
      }

      observe(target, observerOptions) {
        this.target = target;
        this.options = observerOptions;
        this.connected = true;
      }

      disconnect() {
        this.connected = false;
      }

      trigger() {
        if (this.connected && typeof this.callback === "function") {
          this.callback([{ type: "childList" }]);
        }
      }
    };
  }

  context.window = context;
  context.globalThis = context;
  context.document.visibilityState = "visible";
  context.document.documentElement = context.document.documentElement;

  vm.createContext(context);
  vm.runInContext(desktopPetSource, context, { filename: "desktop-pet.js" });

  return {
    context,
    storedSettings: initialSettings,
    runtimeMessageCallbacks,
    storageChangeCallbacks,
    mutationObservers,
    triggerMutationObservers() {
      mutationObservers.slice().forEach((observer) => {
        observer.trigger();
      });
    }
  };
}

class FakeClassList {
  constructor(node) {
    this.node = node;
    this.values = new Set();
  }

  add(...tokens) {
    tokens.forEach((token) => {
      if (typeof token === "string" && token.trim().length) {
        token
          .trim()
          .split(/\s+/)
          .forEach((part) => {
            this.values.add(part);
          });
      }
    });
    this.updateNodeClassName();
  }

  remove(...tokens) {
    tokens.forEach((token) => {
      if (typeof token === "string") {
        this.values.delete(token);
      }
    });
    this.updateNodeClassName();
  }

  toggle(token, force) {
    if (typeof force === "undefined") {
      if (this.contains(token)) {
        this.remove(token);
        return false;
      }
      this.add(token);
      return true;
    }

    if (force) {
      this.add(token);
      return true;
    }

    this.remove(token);
    return false;
  }

  contains(token) {
    return this.values.has(token);
  }

  updateNodeClassName() {
    this.node.className = Array.from(this.values).join(" ");
  }
}

class FakeNode {
  constructor(tagName) {
    this.tagName = (tagName || "div").toLowerCase();
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.style = {};
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.shadowRoot = null;
    this.listeners = new Map();
    this.id = "";
  }

  set className(value) {
    const next = String(value || "");
    this.attributes.set("class", next);
    this.classList.values = new Set(
      next
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    );
  }

  get className() {
    return this.attributes.get("class") || "";
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentElement) {
      return;
    }

    this.parentElement.children = this.parentElement.children.filter((node) => node !== this);
    this.parentElement = null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);

    if (name === "id") {
      this.id = "";
    }
    if (name.startsWith("data-")) {
      const key = name
        .slice(5)
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join("");
      delete this.dataset[key];
    }
  }

  setAttribute(name, value) {
    const text = String(value);
    this.attributes.set(name, text);

    if (name === "id") {
      this.id = text;
      return;
    }

    if (name === "class") {
      this.className = text;
      return;
    }

    if (name === "aria-hidden") {
      this.ariaHidden = text;
    }

    if (name.startsWith("data-")) {
      const key = name
        .slice(5)
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join("");
      this.dataset[key] = text;
    }
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    const list = this.listeners.get(type);
    if (!list) {
      return;
    }
    this.listeners.set(
      type,
      list.filter((entry) => entry !== listener)
    );
  }

  dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    listeners.slice().forEach((listener) => {
      listener(event);
    });
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (matchesSelector(current, selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  attachShadow() {
    if (!this.shadowRoot) {
      this.shadowRoot = new FakeShadowRoot(this);
    }
    return this.shadowRoot;
  }
}

class FakeShadowRoot {
  constructor(host) {
    this.host = host;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.parentElement = null;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const output = [];
    collectMatches(this.children, selector, output);
    return output;
  }

  addEventListener() {}
  removeEventListener() {}
}

class FakeDocument {
  constructor() {
    this.documentElement = new FakeNode("html");
    this.body = new FakeNode("body");
    this.documentElement.appendChild(this.body);
    this.listeners = new Map();
    this.visibilityState = "visible";
  }

  createElement(tagName) {
    return new FakeNode(tagName);
  }

  createTextNode(text) {
    const node = new FakeNode("text");
    node.textContent = text || "";
    return node;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const output = [];
    collectMatches([this.documentElement], selector, output);
    return output;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    listeners.slice().forEach((listener) => {
      listener(event);
    });
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
}

function collectMatches(nodes, selector, output) {
  nodes.forEach((node) => {
    if (matchesSelector(node, selector)) {
      output.push(node);
    }
    if (node.children && node.children.length) {
      collectMatches(node.children, selector, output);
    }
  });
}

function matchesSelector(node, selector) {
  if (!node || !selector) {
    return false;
  }

  if (selector.includes(",")) {
    return selector
      .split(",")
      .map((part) => part.trim())
      .some((part) => matchesSelector(node, part));
  }

  if (selector[0] === "#") {
    return node.id === selector.slice(1);
  }

  if (selector[0] === ".") {
    return node.classList.contains(selector.slice(1));
  }

  if (selector[0] === "[") {
    const match = selector.match(/^\[(.+?)=(['"]?)(.*?)\2\]$/);
    if (match) {
      const attrName = match[1];
      const expectedValue = match[3];
      return node.getAttribute ? node.getAttribute(attrName) === expectedValue : false;
    }

    const existsMatch = selector.match(/^\[(.+?)\]$/);
    if (existsMatch) {
      return node.getAttribute ? node.getAttribute(existsMatch[1]) !== null : false;
    }

    return false;
  }

  return node.tagName === selector.toLowerCase();
}

function flushAsync() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
