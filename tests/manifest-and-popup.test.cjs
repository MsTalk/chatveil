const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const manifestPath = path.join(__dirname, "..", "manifest.json");
const packagePath = path.join(__dirname, "..", "package.json");
const popupPath = path.join(__dirname, "..", "popup.html");
const popupScriptPath = path.join(__dirname, "..", "popup.js");

test("manifest registers popup, storage permission, and WhatsApp match", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "0.1.0");
  assert.deepEqual(manifest.icons, {
    16: "icons/chatveil-16.png",
    32: "icons/chatveil-32.png",
    48: "icons/chatveil-48.png",
    128: "icons/chatveil-128.png"
  });
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.deepEqual(manifest.action.default_icon, manifest.icons);
  assert.equal(manifest.permissions.includes("storage"), true);
  assert.equal(manifest.permissions.includes("unlimitedStorage"), true);
  assert.equal(manifest.permissions.includes("tabs"), true);
  assert.equal(manifest.permissions.includes("scripting"), true);
  assert.equal(manifest.permissions.includes("alarms"), true);
  assert.deepEqual(Object.keys(manifest.commands).sort(), [
    "temporary-reveal",
    "toggle-bookmark-bar",
    "toggle-boss-key"
  ]);
  assert.equal(manifest.commands["toggle-bookmark-bar"].suggested_key.default, "Ctrl+Shift+9");
  assert.equal(manifest.commands["toggle-bookmark-bar"].suggested_key.mac, "Command+Shift+9");
  assert.equal(manifest.commands["toggle-bookmark-bar"].suggested_key.windows, "Ctrl+Shift+9");
  assert.equal(manifest.commands["temporary-reveal"].suggested_key.default, "Ctrl+Shift+8");
  assert.equal(manifest.commands["temporary-reveal"].suggested_key.mac, "Command+Shift+8");
  assert.equal(manifest.commands["temporary-reveal"].suggested_key.windows, "Ctrl+Shift+8");
  assert.equal(manifest.commands["toggle-bookmark-bar"].description, "Toggle bookmark bar chat");
  assert.equal(
    manifest.commands["temporary-reveal"].description,
    "Temporarily reveal blurred content"
  );
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(
    manifest.content_scripts[0].matches.includes("https://web.whatsapp.com/*"),
    true
  );
});

test("package metadata carries the release id and version", () => {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  assert.equal(pkg.version, "0.1.0");
  assert.equal(pkg.id, "superStan");
});

test("popup includes the required controls", () => {
  const markup = fs.readFileSync(popupPath, "utf8");

  assert.equal(markup.includes('id="preset-select"'), true);
  assert.equal(markup.includes('id="language-select"'), true);
  assert.equal(markup.includes('id="enabled-toggle"'), true);
  assert.equal(markup.includes('id="hover-toggle"'), true);
  assert.equal(markup.includes('id="hold-reveal-toggle"'), true);
  assert.equal(markup.includes('id="targets-root"'), true);
  assert.equal(markup.includes('id="restore-button"'), true);
  assert.equal(markup.includes('id="show-all-button"'), true);
  assert.equal(markup.includes('id="emergency-hide-button"'), true);
  assert.equal(markup.includes('id="temporary-reveal-seconds"'), true);
  assert.equal(markup.includes('id="keep-whatsapp-alive-toggle"'), true);
  assert.equal(markup.includes('id="bookmark-bar-theme"'), true);
  assert.equal(markup.includes('id="contact-aliases"'), true);
  assert.equal(markup.includes('id="pinned-contact-groups"'), true);
  assert.equal(markup.includes('id="cinematic-blur-toggle"'), true);
  assert.equal(markup.includes('id="cinematic-blur-style"'), true);
  assert.equal(markup.includes('id="boss-key-toggle"'), true);
  assert.equal(markup.includes('id="boss-key-theme"'), true);
  assert.equal(markup.includes('id="read-receipt-protection-toggle"'), true);
  assert.equal(markup.includes('id="dashboard-toggle"'), true);
  assert.equal(markup.includes('id="danmu-mode-toggle"'), true);
  assert.equal(markup.includes('id="danmu-speed"'), true);
  assert.equal(markup.includes('id="morse-notifications-toggle"'), true);
  assert.equal(markup.includes('id="morse-contact"'), true);
  assert.equal(markup.includes('id="fake-meeting-toggle"'), true);
  assert.equal(markup.includes('id="fake-meeting-template"'), true);
  assert.equal(markup.includes('id="dashboard-summary"'), true);
  assert.equal(markup.includes('id="desktop-pet-enabled-toggle"'), true);
  assert.equal(markup.includes('id="desktop-pet-mode-select"'), true);
  assert.equal(markup.includes('id="desktop-pet-corner-select"'), true);
  assert.equal(markup.includes('id="desktop-pet-size-select"'), true);
  assert.equal(markup.includes('id="desktop-pet-color-input"'), true);
  assert.equal(markup.includes('id="desktop-pet-hidden-toggle"'), true);
  assert.equal(markup.includes('id="desktop-pet-preview-button"'), true);
  assert.equal(markup.includes("Show everything"), true);
  assert.equal(markup.includes('id="section-toggle-bookmarkBar"'), true);
  assert.equal(markup.includes('id="section-toggle-privacyBlur"'), true);

  const sectionOrder = Array.from(
    markup.matchAll(/<section class="popup__section[^"]*" data-section-key="([^"]+)"/g)
  ).map((match) => match[1]);

  assert.deepEqual(sectionOrder, [
    "bookmarkBar",
    "privacyBlur",
    "quickModes",
    "cinematicBlur",
    "bossKey",
    "cornerCat",
    "receiptPrivacy",
    "dashboard",
    "danmu",
    "morse",
    "fakeMeeting"
  ]);
});

test("popup includes shared scripts before popup.js", () => {
  const markup = fs.readFileSync(popupPath, "utf8");
  const scriptMatches = Array.from(markup.matchAll(/<script src="([^"]+)"><\/script>/g));
  const scriptSources = scriptMatches.map((match) => match[1]);

  assert.deepEqual(scriptSources, [
    "src/shared/settings.js",
    "src/shared/i18n.js",
    "src/shared/runtime.js",
    "src/content/selectors.js",
    "src/content/dashboard-data.js",
    "popup.js"
  ]);
});

test("manifest content scripts keep dependency order", () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert.deepEqual(manifest.content_scripts[0].js, [
    "src/shared/settings.js",
    "src/shared/runtime.js",
    "src/shared/bookmark-data.js",
    "src/content/selectors.js",
    "src/content/filtering.js",
    "src/content/bookmark-bar.js",
    "src/content/dashboard-data.js",
    "src/content/desktop-pet.js",
    "src/content/boss-key.js",
    "src/content/fake-meeting.js",
    "content.js"
  ]);
  assert.deepEqual(manifest.content_scripts[0].css, [
    "content.css",
    "src/content/bookmark-bar.css",
    "src/content/desktop-pet.css",
    "src/content/boss-key.css",
    "src/content/fake-meeting.css"
  ]);

  assert.deepEqual(manifest.content_scripts[1], {
    matches: ["<all_urls>"],
    exclude_matches: ["https://web.whatsapp.com/*"],
    js: [
      "src/shared/settings.js",
    "src/shared/bookmark-data.js",
    "src/content/bookmark-bar.js",
    "src/content/dashboard-data.js",
    "src/content/desktop-pet.js",
    "src/content/danmu.js"
  ],
    css: [
      "src/content/bookmark-bar.css",
      "src/content/desktop-pet.css",
      "src/content/danmu.css"
    ],
    run_at: "document_idle"
  });
});

test("popup persists settings even if sendMessage rejects", async () => {
  const popupSource = fs.readFileSync(popupScriptPath, "utf8");
  const document = createDocument();
  const persistedWrites = [];
  const chrome = {
    storage: {
      local: {
        async get() {
          return {};
        },
        async set(value) {
          persistedWrites.push(value);
        }
      }
    },
    tabs: {
      async query() {
        return [{ id: 7 }];
      },
      async sendMessage() {
        throw new Error("Receiving end does not exist.");
      }
    },
    scripting: {
      async insertCSS() {},
      async executeScript() {}
    }
  };

  const context = vm.createContext({
    globalThis: null,
    chrome,
    document,
    console,
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurI18n: require("../src/shared/i18n.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js"),
    WhatsAppBlurSelectors: require("../src/content/selectors.js")
  });
  context.globalThis = context;

  new vm.Script(popupSource, { filename: "popup.js" }).runInContext(context);
  await document.dispatch("DOMContentLoaded");

  const enabledToggle = document.getElementById("enabled-toggle");
  enabledToggle.checked = false;

  await assert.doesNotReject(async () => {
    await enabledToggle.dispatch("change");
  });

  assert.equal(persistedWrites.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(persistedWrites[0])), {
    waPrivacyBlurSettings: {
      enabled: false,
      hoverReveal: true,
      holdRevealEnabled: false,
      idleBlurEnabled: false,
      idleTimeoutMs: 30000,
      temporaryRevealSeconds: 5,
      language: "en",
      bookmarkBarEnabled: false,
      keepWhatsAppAlive: false,
      activePreset: "custom",
      bookmarkBarTheme: "classic",
      pinnedContacts: [],
      contactAliases: {},
      pinnedContactGroups: [],
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
      desktopPetEnabled: false,
      desktopPetTheme: "pixel-cat",
      desktopPetMode: "hybrid",
      desktopPetCorner: "bottom-right",
      desktopPetSize: "medium",
      desktopPetColor: "#ffd782",
      desktopPetHidden: false,
      popupExpandedSections: {
        bookmarkBar: true,
        privacyBlur: true,
        quickModes: false,
        cinematicBlur: false,
        bossKey: false,
        cornerCat: false,
        receiptPrivacy: false,
        dashboard: false,
        danmu: false,
        morse: false,
        fakeMeeting: false
      },
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
  });
});

test("popup language selector persists the selected language without broadcasting", async () => {
  const popupSource = fs.readFileSync(popupScriptPath, "utf8");
  const document = createDocument();
  const persistedWrites = [];
  let tabQueryCount = 0;
  const chrome = {
    storage: {
      local: {
        async get() {
          return {};
        },
        async set(value) {
          persistedWrites.push(value);
        }
      }
    },
    tabs: {
      async query() {
        tabQueryCount += 1;
        return [{ id: 7 }];
      },
      async sendMessage() {
        throw new Error("Language changes stay in popup.");
      }
    },
    scripting: {
      async insertCSS() {},
      async executeScript() {}
    }
  };

  const context = vm.createContext({
    globalThis: null,
    chrome,
    document,
    console,
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurI18n: require("../src/shared/i18n.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js"),
    WhatsAppBlurSelectors: require("../src/content/selectors.js")
  });
  context.globalThis = context;

  new vm.Script(popupSource, { filename: "popup.js" }).runInContext(context);
  await document.dispatch("DOMContentLoaded");

  const languageSelect = document.getElementById("language-select");
  assert.deepEqual(
    languageSelect.children.map((option) => option.value),
    ["en", "zh-Hant", "zh-Hans"]
  );

  languageSelect.value = "zh-Hant";

  await languageSelect.dispatch("change");

  assert.equal(persistedWrites.length, 1);
  assert.equal(persistedWrites[0].waPrivacyBlurSettings.language, "zh-Hant");
  assert.equal(document.documentElement.lang, "zh-Hant");
  assert.equal(document.getElementById("show-all-button").textContent, "顯示全部 5 秒");
  assert.equal(tabQueryCount, 0);
});

test("popup persists desktop pet color changes", async () => {
  const popupSource = fs.readFileSync(popupScriptPath, "utf8");
  const document = createDocument();
  const persistedWrites = [];
  const chrome = {
    storage: {
      local: {
        async get() {
          return {};
        },
        async set(value) {
          persistedWrites.push(value);
        }
      }
    },
    tabs: {
      async query() {
        return [];
      },
      async sendMessage() {}
    },
    scripting: {
      async insertCSS() {},
      async executeScript() {}
    }
  };

  const context = vm.createContext({
    globalThis: null,
    chrome,
    document,
    console,
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurI18n: require("../src/shared/i18n.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js"),
    WhatsAppBlurSelectors: require("../src/content/selectors.js")
  });
  context.globalThis = context;

  new vm.Script(popupSource, { filename: "popup.js" }).runInContext(context);
  await document.dispatch("DOMContentLoaded");

  const colorInput = document.getElementById("desktop-pet-color-input");
  colorInput.value = "#6EC6FF";

  await colorInput.dispatch("input");

  assert.equal(persistedWrites.length, 1);
  assert.equal(
    persistedWrites[0].waPrivacyBlurSettings.desktopPetColor,
    "#6ec6ff"
  );
});

test("popup injects bookmark-bar assets when enabling on a tab without a receiver", async () => {
  const popupSource = fs.readFileSync(popupScriptPath, "utf8");
  const document = createDocument();
  const injectedCss = [];
  const injectedScripts = [];
  let sendAttempts = 0;

  const chrome = {
    storage: {
      local: {
        async get() {
          return {};
        },
        async set() {}
      }
    },
    tabs: {
      async query() {
        return [{ id: 12 }];
      },
      async sendMessage() {
        sendAttempts += 1;
        if (sendAttempts <= 2) {
          throw new Error("Receiving end does not exist.");
        }
      }
    },
    scripting: {
      async insertCSS(details) {
        injectedCss.push(details);
      },
      async executeScript(details) {
        injectedScripts.push(details);
      }
    }
  };

  const context = vm.createContext({
    globalThis: null,
    chrome,
    document,
    console,
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurI18n: require("../src/shared/i18n.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js"),
    WhatsAppBlurSelectors: require("../src/content/selectors.js")
  });
  context.globalThis = context;

  new vm.Script(popupSource, { filename: "popup.js" }).runInContext(context);
  await document.dispatch("DOMContentLoaded");

  const bookmarkToggle = document.getElementById("bookmark-bar-toggle");
  bookmarkToggle.checked = true;

  await assert.doesNotReject(async () => {
    await bookmarkToggle.dispatch("change");
  });

  assert.equal(sendAttempts, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(injectedCss)), [
    {
      target: { tabId: 12 },
      files: ["src/content/bookmark-bar.css"]
    }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(injectedScripts)), [
    {
      target: { tabId: 12 },
      files: ["src/content/bookmark-bar.js"]
    }
  ]);
});

test("popup defaults bookmark and privacy blur sections to expanded and persists accordion changes", async () => {
  const popupSource = fs.readFileSync(popupScriptPath, "utf8");
  const document = createDocument();
  const persistedWrites = [];
  let tabQueryCount = 0;
  const chrome = {
    storage: {
      local: {
        async get() {
          return {};
        },
        async set(value) {
          persistedWrites.push(value);
        }
      }
    },
    tabs: {
      async query() {
        tabQueryCount += 1;
        return [];
      },
      async sendMessage() {}
    },
    scripting: {
      async insertCSS() {},
      async executeScript() {}
    }
  };

  const context = vm.createContext({
    globalThis: null,
    chrome,
    document,
    console,
    WhatsAppBlurSettings: require("../src/shared/settings.js"),
    WhatsAppBlurI18n: require("../src/shared/i18n.js"),
    WhatsAppBlurRuntime: require("../src/shared/runtime.js"),
    WhatsAppBlurSelectors: require("../src/content/selectors.js")
  });
  context.globalThis = context;

  new vm.Script(popupSource, { filename: "popup.js" }).runInContext(context);
  await document.dispatch("DOMContentLoaded");

  const bookmarkToggle = document.getElementById("section-toggle-bookmarkBar");
  const privacyToggle = document.getElementById("section-toggle-privacyBlur");
  const quickModesToggle = document.getElementById("section-toggle-quickModes");
  const bookmarkContent = document.getElementById("section-content-bookmarkBar");
  const privacyContent = document.getElementById("section-content-privacyBlur");
  const quickModesContent = document.getElementById("section-content-quickModes");

  assert.equal(bookmarkToggle.getAttribute("aria-expanded"), "true");
  assert.equal(privacyToggle.getAttribute("aria-expanded"), "true");
  assert.equal(quickModesToggle.getAttribute("aria-expanded"), "false");
  assert.equal(bookmarkContent.hidden, false);
  assert.equal(privacyContent.hidden, false);
  assert.equal(quickModesContent.hidden, true);

  await quickModesToggle.dispatch("click");

  assert.equal(quickModesToggle.getAttribute("aria-expanded"), "true");
  assert.equal(quickModesContent.hidden, false);
  assert.equal(tabQueryCount, 0);
  assert.equal(persistedWrites.length, 1);
  assert.deepEqual(persistedWrites[0].waPrivacyBlurSettings.popupExpandedSections, {
    bookmarkBar: true,
    privacyBlur: true,
    quickModes: true,
    cinematicBlur: false,
    bossKey: false,
    cornerCat: false,
    receiptPrivacy: false,
    dashboard: false,
    danmu: false,
    morse: false,
    fakeMeeting: false
  });
});

function createDocument() {
  const elementsById = new Map();
  const listeners = new Map();
  const sectionElements = [];

  const document = {
    documentElement: {
      lang: ""
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    createElement(tagName) {
      return createElement(tagName);
    },
    querySelectorAll(selector) {
      if (selector === ".popup__section[data-section-key]") {
        return sectionElements.slice();
      }

      return [];
    },
    async dispatch(type) {
      const handler = listeners.get(type);

      if (handler) {
        await handler({ type, target: document });
      }
    }
  };

  [
    "language-select",
    "preset-select",
    "enabled-toggle",
    "hover-toggle",
    "idle-blur-toggle",
    "idle-timeout-wrapper",
    "idle-timeout",
    "bookmark-bar-toggle",
    "targets-root",
    "restore-button",
    "show-all-button",
    "bookmark-bar-color",
    "desktop-pet-enabled-toggle",
    "desktop-pet-mode-select",
    "desktop-pet-corner-select",
    "desktop-pet-size-select",
    "desktop-pet-color-input",
    "desktop-pet-hidden-toggle",
    "desktop-pet-preview-button",
    "section-toggle-bookmarkBar",
    "section-toggle-privacyBlur",
    "section-toggle-quickModes",
    "section-content-bookmarkBar",
    "section-content-privacyBlur",
    "section-content-quickModes",
    "fake-meeting-toggle",
    "fake-meeting-generate-button",
    "dashboard-toggle",
    "dashboard-summary",
    "dashboard-total-messages",
    "dashboard-active-chats",
    "dashboard-top-contact",
    "dashboard-top-emoji"
  ].forEach((id) => {
    const tag =
      id === "targets-root" || id === "idle-timeout-wrapper"
        ? "div"
        : id.startsWith("section-content-")
          ? "div"
          : id.startsWith("section-toggle-")
            ? "button"
        : id === "idle-timeout" ||
            id === "language-select" ||
            id === "preset-select" ||
            id.startsWith("desktop-pet-") && id.endsWith("-select")
          ? "select"
          : id === "bookmark-bar-color" || id === "desktop-pet-color-input"
            ? "input"
            : id === "desktop-pet-preview-button"
              ? "button"
              : "input";
    const element = createElement(tag);
    element.id = id;
    elementsById.set(id, element);
  });

  [
    "bookmarkBar",
    "privacyBlur",
    "quickModes",
    "cinematicBlur",
    "bossKey",
    "cornerCat",
    "receiptPrivacy",
    "dashboard",
    "danmu",
    "morse",
    "fakeMeeting"
  ].forEach((key) => {
    const section = createElement("section");
    section.className = "popup__section";
    section.dataset.sectionKey = key;
    sectionElements.push(section);
  });

  return document;
}

function createElement(tagName) {
  const listeners = new Map();
  const element = {
    tagName: tagName.toUpperCase(),
    children: [],
    dataset: {},
    checked: false,
    disabled: false,
    className: "",
    textContent: "",
    value: "",
    placeholder: "",
    type: "",
    id: "",
    style: {},
    hidden: false,
    attributes: new Map(),
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    querySelectorAll(selector) {
      if (selector !== "input[data-target-key]") {
        return [];
      }

      return collectTargetInputs(this);
    },
    async dispatch(type) {
      const handler = listeners.get(type);

      if (handler) {
        await handler({ type, target: this });
      }
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    getAttribute(name) {
      return this.attributes.has(name) ? this.attributes.get(name) : null;
    }
  };

  Object.defineProperty(element, "innerHTML", {
    get() {
      return "";
    },
    set() {
      this.children = [];
    }
  });

  return element;
}

function collectTargetInputs(root) {
  const matches = [];

  root.children.forEach((child) => {
    if (child.tagName === "INPUT" && child.dataset.targetKey) {
      matches.push(child);
    }

    matches.push(...collectTargetInputs(child));
  });

  return matches;
}
