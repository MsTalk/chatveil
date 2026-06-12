(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppDesktopPet = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SETTINGS_KEY = "waPrivacyBlurSettings";
  const HOST_ID = "wa-desktop-pet-root";
  const HOST_CLASS = "wa-desktop-pet-root";
  const PREVIEW_MOOD = "preview";
  const INTERACTION_MOOD = "interactive";
  const REACTIVE_MOOD = "reactive";
  const IDLE_MOOD = "idle";
  const PREVIEW_DURATION_MS = 900;
  const MOOD_DURATION_MS = 500;
  const DESKTOP_PET_MODES = ["quiet", "reactive", "interactive", "hybrid"];
  const DESKTOP_PET_CORNERS = ["bottom-right", "bottom-left", "top-right", "top-left"];
  const DESKTOP_PET_SIZES = ["small", "medium", "large"];
  const DESKTOP_PET_THEMES = ["pixel-cat"];
  const DEFAULT_DESKTOP_PET_COLOR = "#ffd782";
  const WHATSAPP_HOSTNAME = "web.whatsapp.com";
  const WHATSAPP_ACTIVITY_SCAN_DELAY_MS = 80;
  const INCOMING_MESSAGE_EVENTS_KEY = "waIncomingMessageEvents";
  const BOOKMARK_BAR_DATA_KEY = "waBookmarkBarData";
  const settingsApi =
    (typeof globalThis !== "undefined" && globalThis.WhatsAppBlurSettings) ||
    fallbackSettingsApi();
  const runtimeApi =
    (typeof globalThis !== "undefined" && globalThis.WhatsAppBlurRuntime) ||
    fallbackRuntimeApi();

  let currentSettings = settingsApi.mergeSettings();
  let host = null;
  let shadowRoot = null;
  let storageListenerAttached = false;
  let messageListenerAttached = false;
  let interactionListenersAttached = false;
  let whatsAppActivityObserver = null;
  let whatsAppActivitySignature = "";
  let whatsAppActivityScanTimerId = null;
  let previewTimerId = null;
  let moodTimerId = null;
  let eventState = {
    clickListener: null,
    enterListener: null,
    leaveListener: null,
    focusListener: null,
    blurListener: null,
    visibilityListener: null
  };

  if (
    typeof chrome !== "undefined" &&
    chrome &&
    chrome.storage &&
    chrome.storage.local &&
    typeof document !== "undefined" &&
    document &&
    document.body
  ) {
    void autoInit();
  }

  async function autoInit() {
    try {
      await init();
      subscribeStorageChanges();
      subscribeMessage();
    } catch (error) {
      // Do not fail on blocked pages or partial test environments.
    }
  }

  async function init(rawSettings) {
    const sourceSettings =
      arguments.length > 0
        ? rawSettings
        : await readStoredSettings();

    return applySettings(sourceSettings);
  }

  async function readStoredSettings() {
    try {
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.local ||
        typeof chrome.storage.local.get !== "function"
      ) {
        return settingsApi.mergeSettings();
      }

      const result = await chrome.storage.local.get(SETTINGS_KEY);
      return settingsApi.mergeSettings(result[SETTINGS_KEY]);
    } catch (error) {
      return settingsApi.mergeSettings();
    }
  }

  function applySettings(rawSettings) {
    const merged = settingsApi.mergeSettings(rawSettings || {});
    currentSettings = merged;

    if (!merged.desktopPetEnabled) {
      destroy();
      return null;
    }

    createHostIfNeeded();
    applyHostState(merged);
    bindModeInteractions(merged);
    return host;
  }

  function createHostIfNeeded() {
    const existingHost = safeQueryHost();
    if (existingHost && existingHost !== host) {
      host = existingHost;
      shadowRoot = host.shadowRoot || null;
    }

    if (host) {
      ensureHostInDom();
      if (!shadowRoot) {
        shadowRoot = ensureShadowRoot(host);
      }
      return host;
    }

    if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
      return null;
    }

    host = document.createElement("div");
    host.id = HOST_ID;
    host.className = HOST_CLASS;
    host.setAttribute("aria-hidden", "false");

    shadowRoot = ensureShadowRoot(host);

    document.body.appendChild(host);
    return host;
  }

  function ensureShadowRoot(petHost) {
    if (petHost.shadowRoot) {
      return petHost.shadowRoot;
    }

    const safeAttachShadow = petHost.attachShadow || null;
    if (!safeAttachShadow || typeof safeAttachShadow !== "function") {
      return null;
    }

    const root = safeAttachShadow.call(petHost, { mode: "open" });
    mountPetDom(root);
    return root;
  }

  function mountPetDom(petShadowRoot) {
    if (!petShadowRoot || typeof petShadowRoot.appendChild !== "function") {
      return;
    }

    if (
      typeof petShadowRoot.querySelector === "function" &&
      petShadowRoot.querySelector(".wa-desktop-pet-pixel-cat")
    ) {
      return;
    }

    const style = (typeof document !== "undefined" && document.createElement)
      ? document.createElement("style")
      : null;
    if (style) {
      style.textContent = `
        :host {
          display: block;
          --wa-desktop-pet-fur: #ffd782;
          --wa-desktop-pet-fur-light: #ffe9ae;
          --wa-desktop-pet-fur-shadow: #f0aa54;
          --wa-desktop-pet-ear-inner: #f28d75;
        }
        .wa-desktop-pet-wrap {
          width: 100%;
          height: 100%;
          position: relative;
          filter: drop-shadow(0 3px 0 rgba(47, 47, 47, 0.28));
          image-rendering: pixelated;
          transform-origin: 50% 90%;
          transition: transform 120ms ease, filter 120ms ease;
          animation: wa-desktop-pet-idle 2200ms steps(2, end) infinite;
        }
        .wa-desktop-pet-pixel-cat {
          position: absolute;
          left: 12%;
          top: 16%;
          width: 72%;
          height: 58%;
          background: var(--wa-desktop-pet-fur, #ffd782);
          border: 2px solid #2f2f2f;
          box-sizing: border-box;
          border-radius: 12px 12px 10px 10px;
          box-shadow:
            inset 4px 0 0 var(--wa-desktop-pet-fur-light, #ffe9ae),
            inset -4px 0 0 var(--wa-desktop-pet-fur-shadow, #f0aa54);
        }
        .wa-desktop-pet-body {
          position: absolute;
          left: 26%;
          bottom: 3%;
          width: 48%;
          height: 42%;
          background: var(--wa-desktop-pet-fur-shadow, #f3b85f);
          border: 2px solid #2f2f2f;
          border-radius: 10px 10px 14px 14px;
          box-sizing: border-box;
        }
        .wa-desktop-pet-ear {
          position: absolute;
          top: 6%;
          width: 24%;
          height: 26%;
          background: var(--wa-desktop-pet-fur, #ffd782);
          border: 2px solid #2f2f2f;
          box-sizing: border-box;
          transform: rotate(45deg);
        }
        .wa-desktop-pet-ear::after {
          content: "";
          position: absolute;
          left: 28%;
          top: 28%;
          width: 44%;
          height: 44%;
          background: var(--wa-desktop-pet-ear-inner, #f28d75);
        }
        .wa-desktop-pet-ear--left {
          left: 17%;
        }
        .wa-desktop-pet-ear--right {
          right: 17%;
        }
        .wa-desktop-pet-eye {
          position: absolute;
          top: 44%;
          width: 8%;
          height: 12%;
          background: #2f2f2f;
          border-radius: 1px;
          transition: height 80ms ease, transform 80ms ease;
        }
        .wa-desktop-pet-eye--left {
          left: 29%;
        }
        .wa-desktop-pet-eye--right {
          right: 29%;
        }
        .wa-desktop-pet-muzzle {
          position: absolute;
          left: 42%;
          top: 56%;
          width: 16%;
          height: 12%;
          background: #fff4d6;
          border: 2px solid #2f2f2f;
          border-radius: 0 0 10px 10px;
          box-sizing: border-box;
        }
        .wa-desktop-pet-muzzle::before {
          content: "";
          position: absolute;
          left: 38%;
          top: -5px;
          width: 4px;
          height: 4px;
          background: #2f2f2f;
        }
        .wa-desktop-pet-whisker {
          position: absolute;
          top: 64%;
          width: 26%;
          height: 2px;
          background: #2f2f2f;
        }
        .wa-desktop-pet-whisker--left {
          left: 10%;
          box-shadow: 0 7px 0 #2f2f2f;
        }
        .wa-desktop-pet-whisker--right {
          right: 10%;
          box-shadow: 0 7px 0 #2f2f2f;
        }
        .wa-desktop-pet-tail {
          position: absolute;
          right: 3%;
          bottom: 16%;
          width: 24%;
          height: 22%;
          border: 3px solid #2f2f2f;
          border-left: 0;
          border-radius: 0 14px 14px 0;
          transform-origin: 0 50%;
          background: transparent;
        }
        .wa-desktop-pet-paw {
          position: absolute;
          bottom: 2%;
          width: 12%;
          height: 10%;
          background: var(--wa-desktop-pet-fur, #ffd782);
          border: 2px solid #2f2f2f;
          box-sizing: border-box;
        }
        .wa-desktop-pet-paw--left {
          left: 30%;
        }
        .wa-desktop-pet-paw--right {
          right: 30%;
        }
        :host([data-mood="preview"]) .wa-desktop-pet-wrap {
          animation: wa-desktop-pet-bounce 420ms steps(2, end) infinite;
          filter: drop-shadow(0 5px 0 rgba(47, 47, 47, 0.32));
        }
        :host([data-mood="preview"]) .wa-desktop-pet-eye--right {
          height: 3px;
          transform: translateY(3px);
        }
        :host([data-mood="reactive"]) .wa-desktop-pet-wrap {
          transform: translateY(-3px);
        }
        :host([data-mood="reactive"]) .wa-desktop-pet-tail {
          animation: wa-desktop-pet-tail 280ms steps(2, end) infinite;
        }
        :host([data-mood="interactive"]) .wa-desktop-pet-wrap {
          animation: wa-desktop-pet-bounce 360ms steps(2, end) 2;
          transform: rotate(-4deg) translateY(-3px);
        }
        :host([data-mood="interactive"]) .wa-desktop-pet-eye {
          height: 14%;
        }
        @keyframes wa-desktop-pet-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
        @keyframes wa-desktop-pet-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.04); }
        }
        @keyframes wa-desktop-pet-tail {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(16deg); }
        }
      `;
      petShadowRoot.appendChild(style);
    }

    const wrap = (typeof document !== "undefined" && document.createElement)
      ? document.createElement("div")
      : null;
    if (!wrap) {
      return;
    }

    wrap.className = "wa-desktop-pet-wrap";
    [
      "wa-desktop-pet-tail",
      "wa-desktop-pet-body",
      "wa-desktop-pet-ear wa-desktop-pet-ear--left",
      "wa-desktop-pet-ear wa-desktop-pet-ear--right"
    ].forEach(function (className) {
      wrap.appendChild(createPetPart(className));
    });

    const face = createPetPart("wa-desktop-pet-pixel-cat");
    [
      "wa-desktop-pet-eye wa-desktop-pet-eye--left",
      "wa-desktop-pet-eye wa-desktop-pet-eye--right",
      "wa-desktop-pet-muzzle",
      "wa-desktop-pet-whisker wa-desktop-pet-whisker--left",
      "wa-desktop-pet-whisker wa-desktop-pet-whisker--right"
    ].forEach(function (className) {
      face.appendChild(createPetPart(className));
    });
    wrap.appendChild(face);

    [
      "wa-desktop-pet-paw wa-desktop-pet-paw--left",
      "wa-desktop-pet-paw wa-desktop-pet-paw--right"
    ].forEach(function (className) {
      wrap.appendChild(createPetPart(className));
    });
    petShadowRoot.appendChild(wrap);
  }

  function createPetPart(className) {
    const part = document.createElement("div");
    part.className = className;
    part.setAttribute("aria-hidden", "true");
    return part;
  }

  function safeQueryHost() {
    if (typeof document === "undefined" || typeof document.querySelector !== "function") {
      return null;
    }
    return document.querySelector("#" + HOST_ID);
  }

  function ensureHostInDom() {
    if (!host || !host.parentElement) {
      if (typeof document !== "undefined" && document.body) {
        document.body.appendChild(host);
      }
    }
  }

  function applyHostState(merged) {
    if (!host) {
      return;
    }

    setAttributeIfValue(host, "data-mode", merged.desktopPetMode || "hybrid");
    setAttributeIfValue(host, "data-corner", merged.desktopPetCorner || "bottom-right");
    setAttributeIfValue(host, "data-size", merged.desktopPetSize || "medium");
    const petColor = normalizeDesktopPetColor(merged.desktopPetColor);
    setAttributeIfValue(host, "data-color", petColor);
    applyPetPalette(petColor);
    setAttributeIfValue(
      host,
      "data-mood",
      merged.desktopPetHidden ? IDLE_MOOD : host.getAttribute("data-mood") || IDLE_MOOD
    );

    setAttributeIfValue(host, "data-theme", merged.desktopPetTheme || "pixel-cat");
    if (host.dataset) {
      host.dataset.mode = merged.desktopPetMode || "hybrid";
      host.dataset.corner = merged.desktopPetCorner || "bottom-right";
      host.dataset.size = merged.desktopPetSize || "medium";
      host.dataset.color = petColor;
      host.dataset.mood = merged.desktopPetHidden
        ? IDLE_MOOD
        : host.getAttribute("data-mood") || IDLE_MOOD;
      host.dataset.theme = merged.desktopPetTheme || "pixel-cat";
    }

    if (merged.desktopPetHidden) {
      host.classList.add("is-hidden");
      host.setAttribute("aria-hidden", "true");
    } else {
      host.classList.remove("is-hidden");
      host.setAttribute("aria-hidden", "false");
    }
  }

  function normalizeDesktopPetColor(value) {
    if (typeof value !== "string") {
      return DEFAULT_DESKTOP_PET_COLOR;
    }

    const normalized = value.trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : DEFAULT_DESKTOP_PET_COLOR;
  }

  function applyPetPalette(baseColor) {
    if (!host || !host.style) {
      return;
    }

    const normalized = normalizeDesktopPetColor(baseColor);
    setStyleProperty(host, "--wa-desktop-pet-fur", normalized);
    setStyleProperty(host, "--wa-desktop-pet-fur-light", mixHexColor(normalized, "#ffffff", 0.36));
    setStyleProperty(host, "--wa-desktop-pet-fur-shadow", mixHexColor(normalized, "#7a3a18", 0.28));
    setStyleProperty(host, "--wa-desktop-pet-ear-inner", mixHexColor(normalized, "#ff728d", 0.48));
  }

  function setStyleProperty(element, name, value) {
    if (!element || !element.style) {
      return;
    }

    if (typeof element.style.setProperty === "function") {
      element.style.setProperty(name, value);
      return;
    }

    element.style[name] = value;
  }

  function mixHexColor(sourceHex, targetHex, targetWeight) {
    const source = parseHexColor(sourceHex) || parseHexColor(DEFAULT_DESKTOP_PET_COLOR);
    const target = parseHexColor(targetHex) || parseHexColor("#ffffff");
    const weight = Math.min(1, Math.max(0, targetWeight));

    return rgbToHex({
      r: Math.round(source.r * (1 - weight) + target.r * weight),
      g: Math.round(source.g * (1 - weight) + target.g * weight),
      b: Math.round(source.b * (1 - weight) + target.b * weight)
    });
  }

  function parseHexColor(hex) {
    const normalized = normalizeDesktopPetColor(hex);
    const match = normalized.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
    if (!match) {
      return null;
    }

    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16)
    };
  }

  function rgbToHex(rgb) {
    return "#" + [rgb.r, rgb.g, rgb.b]
      .map(function (channel) {
        return channel.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function setAttributeIfValue(element, name, value) {
    if (!element || typeof element.setAttribute !== "function") {
      return;
    }

    if (value == null) {
      element.removeAttribute(name);
      return;
    }

    element.setAttribute(name, String(value));
  }

  function setMood(mood) {
    if (!host) {
      return;
    }
    host.setAttribute("data-mood", mood);
  }

  function pulseMood(mood, durationMs) {
    if (!host) {
      return;
    }

    setMood(mood);
    if (moodTimerId !== null && typeof window !== "undefined" && window.clearTimeout) {
      window.clearTimeout(moodTimerId);
    } else if (moodTimerId !== null) {
      clearTimeout(moodTimerId);
    }

    moodTimerId = schedule(function () {
      if (host && currentSettings) {
        setMood(IDLE_MOOD);
        if (!previewTimerId) {
          applyVisibilityState(currentSettings);
        }
      }
      moodTimerId = null;
    }, durationMs);
  }

  function applyVisibilityState(merged) {
    if (!host) {
      return;
    }
    const isHidden = !!(merged && merged.desktopPetHidden);
    if (isHidden) {
      host.classList.add("is-hidden");
      host.setAttribute("aria-hidden", "true");
    } else {
      host.classList.remove("is-hidden");
      host.setAttribute("aria-hidden", "false");
    }
  }

  function preview(durationMs) {
    if (!currentSettings || !currentSettings.desktopPetEnabled) {
      return false;
    }

    if (!host) {
      createHostIfNeeded();
    }
    if (!host) {
      return false;
    }

    const previewStateDuration = typeof durationMs === "number" && durationMs > 0 ? durationMs : PREVIEW_DURATION_MS;
    const shouldShowHost = host && host.classList && host.classList.contains("is-hidden");
    const previousHidden = host.classList && host.classList.contains("is-hidden");

    if (previousHidden) {
      host.classList.remove("is-hidden");
      host.setAttribute("aria-hidden", "false");
    }

    setMood(PREVIEW_MOOD);
    if (previewTimerId !== null && typeof window !== "undefined" && window.clearTimeout) {
      window.clearTimeout(previewTimerId);
    } else if (previewTimerId !== null) {
      clearTimeout(previewTimerId);
    }

    previewTimerId = schedule(function () {
      if (!host) {
        return;
      }
      setMood(IDLE_MOOD);
      applyVisibilityState(currentSettings);
      previewTimerId = null;
    }, previewStateDuration);

    return shouldShowHost && previousHidden;
  }

  function bindModeInteractions(merged) {
    unbindModeInteractions();

    if (!host || !merged || !merged.desktopPetEnabled) {
      return;
    }

    const isInteractive = merged.desktopPetMode === "interactive" || merged.desktopPetMode === "hybrid";
    const isReactive = merged.desktopPetMode === "reactive" || merged.desktopPetMode === "hybrid";

    if (!isInteractive && !isReactive) {
      interactionListenersAttached = false;
      return;
    }

    if (isInteractive) {
      eventState.clickListener = function () {
        pulseMood(INTERACTION_MOOD, MOOD_DURATION_MS);
      };
      eventState.enterListener = function () {
        pulseMood(INTERACTION_MOOD, MOOD_DURATION_MS);
      };
      host.addEventListener("click", eventState.clickListener);
      host.addEventListener("mouseenter", eventState.enterListener);
    }

    if (isReactive) {
      eventState.focusListener = function () {
        pulseMood(REACTIVE_MOOD, MOOD_DURATION_MS);
      };
      eventState.blurListener = function () {
        pulseMood(REACTIVE_MOOD, MOOD_DURATION_MS);
      };
      eventState.visibilityListener = function () {
        if (document && document.visibilityState === "hidden") {
          pulseMood(REACTIVE_MOOD, MOOD_DURATION_MS);
        }
      };
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("focus", eventState.focusListener);
        window.addEventListener("blur", eventState.blurListener);
      }
      if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("visibilitychange", eventState.visibilityListener);
      } else {
        window.addEventListener("visibilitychange", eventState.visibilityListener);
      }
      installWhatsAppActivityObserver();
    }

    interactionListenersAttached = true;
  }

  function unbindModeInteractions() {
    disconnectWhatsAppActivityObserver();

    if (!interactionListenersAttached || !host) {
      clearInteractionHandlers();
      interactionListenersAttached = false;
      return;
    }

    if (eventState.clickListener) {
      host.removeEventListener("click", eventState.clickListener);
    }
    if (eventState.enterListener) {
      host.removeEventListener("mouseenter", eventState.enterListener);
    }

    if (eventState.visibilityListener && typeof document !== "undefined" && document.removeEventListener) {
      document.removeEventListener("visibilitychange", eventState.visibilityListener);
    } else if (eventState.visibilityListener && typeof window !== "undefined" && window.removeEventListener) {
      window.removeEventListener("visibilitychange", eventState.visibilityListener);
    }

    if (typeof window !== "undefined" && window.removeEventListener) {
      if (eventState.focusListener) {
        window.removeEventListener("focus", eventState.focusListener);
      }
      if (eventState.blurListener) {
        window.removeEventListener("blur", eventState.blurListener);
      }
    }

    clearInteractionHandlers();
    interactionListenersAttached = false;
  }

  function installWhatsAppActivityObserver() {
    if (!isWhatsAppPage()) {
      return;
    }

    if (
      typeof document === "undefined" ||
      !document.body ||
      typeof document.querySelectorAll !== "function"
    ) {
      return;
    }

    const Observer =
      (typeof MutationObserver !== "undefined" && MutationObserver) ||
      (typeof window !== "undefined" && window.MutationObserver);
    if (typeof Observer !== "function") {
      return;
    }

    disconnectWhatsAppActivityObserver();
    whatsAppActivitySignature = getWhatsAppIncomingActivitySignature();
    whatsAppActivityObserver = new Observer(function () {
      scheduleWhatsAppActivityScan();
    });
    whatsAppActivityObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ["aria-label", "data-testid", "data-icon", "class", "title"]
    });
  }

  function disconnectWhatsAppActivityObserver() {
    if (whatsAppActivityScanTimerId !== null) {
      if (typeof window !== "undefined" && window.clearTimeout) {
        window.clearTimeout(whatsAppActivityScanTimerId);
      } else if (typeof clearTimeout !== "undefined") {
        clearTimeout(whatsAppActivityScanTimerId);
      }
    }

    whatsAppActivityScanTimerId = null;

    if (
      whatsAppActivityObserver &&
      typeof whatsAppActivityObserver.disconnect === "function"
    ) {
      whatsAppActivityObserver.disconnect();
    }

    whatsAppActivityObserver = null;
    whatsAppActivitySignature = "";
  }

  function scheduleWhatsAppActivityScan() {
    if (whatsAppActivityScanTimerId !== null) {
      return;
    }

    whatsAppActivityScanTimerId = schedule(function () {
      whatsAppActivityScanTimerId = null;

      if (!shouldReactToIncomingActivity()) {
        whatsAppActivitySignature = getWhatsAppIncomingActivitySignature();
        return;
      }

      const nextSignature = getWhatsAppIncomingActivitySignature();
      if (nextSignature && nextSignature !== whatsAppActivitySignature) {
        pulseMood(REACTIVE_MOOD, MOOD_DURATION_MS);
      }
      whatsAppActivitySignature = nextSignature;
    }, WHATSAPP_ACTIVITY_SCAN_DELAY_MS);
  }

  function shouldReactToIncomingActivity() {
    return !!(
      currentSettings &&
      currentSettings.desktopPetEnabled &&
      (
        currentSettings.desktopPetMode === "reactive" ||
        currentSettings.desktopPetMode === "hybrid"
      )
    );
  }

  function getWhatsAppIncomingActivitySignature() {
    const signals = [];

    collectUnreadActivitySignals(signals);
    collectIncomingMessageSignals(signals);

    return signals
      .filter(Boolean)
      .sort()
      .slice(-40)
      .join("||");
  }

  function collectUnreadActivitySignals(signals) {
    safeQueryAll("[aria-label]").forEach(function (node) {
      if (!isWhatsAppActivityScope(node)) {
        return;
      }

      const label = getAttributeValue(node, "aria-label");
      if (hasUnreadActivityText(label)) {
        signals.push("label:" + normalizeActivitySignal(label, node));
      }
    });

    safeQueryAll("[data-testid]").forEach(function (node) {
      if (!isWhatsAppActivityScope(node)) {
        return;
      }

      const testId = getAttributeValue(node, "data-testid");
      if (isUnreadMarker(testId)) {
        signals.push("testid:" + normalizeActivitySignal(testId, node));
      }
    });

    safeQueryAll("[data-icon]").forEach(function (node) {
      if (!isWhatsAppActivityScope(node)) {
        return;
      }

      const icon = getAttributeValue(node, "data-icon");
      if (isUnreadMarker(icon)) {
        signals.push("icon:" + normalizeActivitySignal(icon, node));
      }
    });
  }

  function collectIncomingMessageSignals(signals) {
    safeQueryAll('#main [data-testid="msg-container"]').forEach(function (container) {
      if (isOutgoingMessageContainer(container)) {
        return;
      }

      signals.push("message:" + getElementActivityFingerprint(container));
    });
  }

  function safeQueryAll(selector) {
    if (
      typeof document === "undefined" ||
      !document ||
      typeof document.querySelectorAll !== "function"
    ) {
      return [];
    }

    try {
      return Array.from(document.querySelectorAll(selector));
    } catch (error) {
      return [];
    }
  }

  function isWhatsAppActivityScope(node) {
    if (!node || typeof node.closest !== "function") {
      return false;
    }

    if (node.closest("#" + HOST_ID)) {
      return false;
    }

    return !!(node.closest("#pane-side") || node.closest("#main"));
  }

  function hasUnreadActivityText(value) {
    const text = String(value || "").trim();
    if (!text) {
      return false;
    }

    return (
      /\b(?:unread|unseen)\b/i.test(text) ||
      /\u672a\s*[\u8bfb\u8b80]\s*(?:\u6d88\u606f|\u8baf\u606f|\u8a0a\u606f)?/i.test(text) ||
      /\d+\s*(?:(?:\u6761|\u689d|\u5247|\u4e2a|\u500b)\s*)?(?:\u672a\u8bfb\u6d88\u606f|\u672a\u8b80\u6d88\u606f|\u672a\u8bfb\u8baf\u606f|\u672a\u8b80\u8a0a\u606f)/i.test(text)
    );
  }

  function isUnreadMarker(value) {
    return /\b(unread|badge|count|notification|meta-count|message-count|new-message|unseen)\b/i.test(
      String(value || "")
    );
  }

  function normalizeActivitySignal(label, node) {
    return [
      String(label || "").trim(),
      getElementActivityFingerprint(node)
    ]
      .filter(Boolean)
      .join(":")
      .slice(0, 240);
  }

  function getElementActivityFingerprint(node) {
    if (!node) {
      return "";
    }

    const stableId =
      getAttributeValue(node, "data-id") ||
      getAttributeValue(node, "id") ||
      getAttributeValue(node, "data-pre-plain-text");
    if (stableId) {
      return stableId;
    }

    return String(node.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(-180);
  }

  function isOutgoingMessageContainer(container) {
    if (!container) {
      return false;
    }

    const className = String(container.className || "");
    if (/\bmessage-out\b/i.test(className)) {
      return true;
    }

    if (getAttributeValue(container, "data-testid") === "outgoing") {
      return true;
    }

    if (
      typeof container.closest === "function" &&
      container.closest(".message-out")
    ) {
      return true;
    }

    return [
      '[data-testid="msg-check"]',
      '[data-testid="msg-dblcheck"]',
      '[data-testid="msg-dblcheck-ack"]',
      '[data-icon="check"]',
      '[data-icon="dblcheck"]',
      '[data-icon="ack"]'
    ].some(function (selector) {
      try {
        return typeof container.querySelector === "function" && container.querySelector(selector);
      } catch (error) {
        return false;
      }
    });
  }

  function getAttributeValue(node, name) {
    if (!node || typeof node.getAttribute !== "function") {
      return "";
    }

    return node.getAttribute(name) || "";
  }

  function isWhatsAppPage() {
    return !!(
      typeof location !== "undefined" &&
      location &&
      location.hostname === WHATSAPP_HOSTNAME
    );
  }

  function clearInteractionHandlers() {
    eventState.clickListener = null;
    eventState.enterListener = null;
    eventState.focusListener = null;
    eventState.blurListener = null;
    eventState.visibilityListener = null;
  }

  function destroy() {
    if (moodTimerId !== null && typeof window !== "undefined" && window.clearTimeout) {
      window.clearTimeout(moodTimerId);
    }
    if (previewTimerId !== null && typeof window !== "undefined" && window.clearTimeout) {
      window.clearTimeout(previewTimerId);
    }
    if (moodTimerId !== null && typeof clearTimeout !== "undefined") {
      clearTimeout(moodTimerId);
    }
    if (previewTimerId !== null && typeof clearTimeout !== "undefined") {
      clearTimeout(previewTimerId);
    }

    moodTimerId = null;
    previewTimerId = null;
    unbindModeInteractions();

    if (host && host.parentElement) {
      host.remove();
    }

    host = null;
    shadowRoot = null;
  }

  function subscribeStorageChanges() {
    if (storageListenerAttached) {
      return;
    }
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.onChanged &&
      chrome.storage.onChanged.addListener
    ) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      storageListenerAttached = true;
    }
  }

  function handleStorageChange(changes, area) {
    if (area !== "local") {
      return;
    }

    if (!changes) {
      return;
    }

    if (changes[SETTINGS_KEY] && "newValue" in changes[SETTINGS_KEY]) {
      applySettings(changes[SETTINGS_KEY].newValue || {});
    }

    if (shouldPulseForIncomingActivity(changes)) {
      pulseMood(REACTIVE_MOOD, MOOD_DURATION_MS);
    }
  }

  function shouldPulseForIncomingActivity(changes) {
    if (!currentSettings || !currentSettings.desktopPetEnabled) {
      return false;
    }

    if (
      currentSettings.desktopPetMode !== "reactive" &&
      currentSettings.desktopPetMode !== "hybrid"
    ) {
      return false;
    }

    return (
      hasNewIncomingMessages(changes[INCOMING_MESSAGE_EVENTS_KEY]) ||
      hasNewIncomingBookmarks(changes[BOOKMARK_BAR_DATA_KEY])
    );
  }

  function hasNewIncomingMessages(change) {
    if (!change) {
      return false;
    }

    const nextEntries = getIncomingMessageEntries(change.newValue);
    const previousEntries = getIncomingMessageEntries(change.oldValue);
    if (!Array.isArray(nextEntries) || !Array.isArray(previousEntries)) {
      return false;
    }

    if (nextEntries.length > previousEntries.length) {
      return true;
    }

    const seenPreviousIds = new Set();
    let hadIdBasedComparison = false;

    previousEntries.forEach(function (entry) {
      const id = getIncomingMessageId(entry);
      if (id == null) {
        return;
      }
      hadIdBasedComparison = true;
      seenPreviousIds.add(id);
    });

    if (!hadIdBasedComparison) {
      return false;
    }

    return nextEntries.some(function (entry) {
      const id = getIncomingMessageId(entry);
      return id != null && !seenPreviousIds.has(id);
    });
  }

  function getIncomingMessageEntries(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || !Array.isArray(value.entries)) {
      return [];
    }

    return value.entries;
  }

  function getIncomingMessageId(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    if (typeof entry.eventId === "string") {
      return entry.eventId;
    }

    if (typeof entry.id === "string") {
      return entry.id;
    }

    return null;
  }

  function hasNewIncomingBookmarks(change) {
    const dashboardData =
      typeof globalThis !== "undefined" &&
      globalThis.WhatsAppBlurDashboardData;
    if (!dashboardData || typeof dashboardData.getNewIncomingMessages !== "function") {
      return false;
    }

    if (!change || change.newValue == null) {
      return false;
    }

    try {
      const newMessages = dashboardData.getNewIncomingMessages(change.oldValue, change.newValue);
      return Array.isArray(newMessages) && newMessages.length > 0;
    } catch (error) {
      return false;
    }
  }

  function subscribeMessage() {
    if (messageListenerAttached) {
      return;
    }
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage &&
      chrome.runtime.onMessage.addListener
    ) {
      chrome.runtime.onMessage.addListener(function (message) {
        if (!message || message.type !== runtimeApi.MESSAGE_TYPES.desktopPetPreview) {
          return;
        }
        preview(message.durationMs);
      });
      messageListenerAttached = true;
    }
  }

  function getHost() {
    if (!host && typeof document !== "undefined") {
      host = safeQueryHost();
      if (host) {
        shadowRoot = host.shadowRoot || null;
      }
    }
    return host;
  }

  function schedule(callback, delay) {
    if (!delay || delay < 0) {
      delay = 0;
    }

    if (typeof window !== "undefined" && window.setTimeout) {
      return window.setTimeout(callback, delay);
    }

    if (typeof setTimeout === "function") {
      return setTimeout(callback, delay);
    }

    return null;
  }

  function fallbackSettingsApi() {
    function mergeDesktopPetMode(rawMode) {
      return DESKTOP_PET_MODES.includes(rawMode) ? rawMode : "hybrid";
    }

    function mergeDesktopPetCorner(rawCorner) {
      return DESKTOP_PET_CORNERS.includes(rawCorner) ? rawCorner : "bottom-right";
    }

    function mergeDesktopPetSize(rawSize) {
      return DESKTOP_PET_SIZES.includes(rawSize) ? rawSize : "medium";
    }

    function mergeDesktopPetTheme(rawTheme) {
      return DESKTOP_PET_THEMES.includes(rawTheme) ? rawTheme : "pixel-cat";
    }

    return {
      mergeSettings(raw) {
        const source = raw || {};
        return {
          desktopPetEnabled: source.desktopPetEnabled === true,
          desktopPetTheme: mergeDesktopPetTheme(source.desktopPetTheme),
          desktopPetMode: mergeDesktopPetMode(source.desktopPetMode),
          desktopPetCorner: mergeDesktopPetCorner(source.desktopPetCorner),
          desktopPetSize: mergeDesktopPetSize(source.desktopPetSize),
          desktopPetColor: normalizeDesktopPetColor(source.desktopPetColor),
          desktopPetHidden: source.desktopPetHidden === true
        };
      }
    };
  }

  function fallbackRuntimeApi() {
    return {
      MESSAGE_TYPES: {
        desktopPetPreview: "WHATSAPP_BLUR_DESKTOP_PET_PREVIEW"
      }
    };
  }

  return {
    init,
    applySettings,
    destroy,
    preview,
    getHost,
    handleStorageChange
  };
});
