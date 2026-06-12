(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurDanmu = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SETTINGS_KEY = "waPrivacyBlurSettings";
  const DATA_KEY = "waBookmarkBarData";
  const bookmarkDataApi =
    (typeof globalThis !== "undefined" && globalThis.WhatsAppBookmarkData) || {
      INCOMING_EVENTS_KEY: "waIncomingMessageEvents",
      getNewIncomingEventEntries: function (previousRaw, nextRaw) {
        const previousIds = new Set(
          previousRaw && Array.isArray(previousRaw.entries)
            ? previousRaw.entries.map(function (entry) {
                return entry && entry.eventId;
              })
            : []
        );
        return nextRaw && Array.isArray(nextRaw.entries)
          ? nextRaw.entries.filter(function (entry) {
              return entry && !previousIds.has(entry.eventId);
            })
          : [];
      },
      getIncomingEventText: function (entry) {
        const source = entry || {};
        const message = source.message || {};
        return (source.text || message.text || message.fallbackText || "").trim();
      }
    };
  const INCOMING_EVENTS_KEY =
    bookmarkDataApi.INCOMING_EVENTS_KEY || "waIncomingMessageEvents";
  const LANE_COUNT = 5;
  const MAX_ACTIVE_DANMU = 30;
  const MAX_QUEUED_DANMU = 80;
  const DANMU_STAGGER_MS = 250;
  let container = null;
  let isEnabled = false;
  let currentSpeed = "normal";
  let storageListenerInstalled = false;
  let activeDanmuCount = 0;
  let laneCursor = 0;
  let pendingDanmu = [];
  let drainTimerId = null;

  const SPEED_MAP = Object.freeze({
    slow: 12,
    normal: 8,
    fast: 5
  });

  function init(enabled, speed) {
    isEnabled = !!enabled;
    currentSpeed = SPEED_MAP[speed] ? speed : "normal";

    if (isEnabled && !container) {
      createContainer();
    } else if (!isEnabled && container) {
      destroyContainer();
    }
  }

  function createContainer() {
    if (container) {
      return;
    }

    container = document.createElement("div");
    container.id = "wa-danmu-container";
    container.className = "wa-danmu-container";

    document.body.appendChild(container);
  }

  function destroyContainer() {
    if (!container) {
      return;
    }

    pendingDanmu = [];
    activeDanmuCount = 0;
    clearDrainTimer();
    container.remove();
    container = null;
  }

  function createDanmu(text, contactName, color, speed) {
    if (!isEnabled || !container) {
      return;
    }

    const displayText = typeof text === "string" ? text.trim() : "";
    if (!displayText) {
      return;
    }

    const danmu = document.createElement("div");
    danmu.className = "wa-danmu-item";
    danmu.textContent = (contactName ? contactName + ": " : "") + displayText;

    if (color) {
      danmu.style.color = color;
    }

    const duration = SPEED_MAP[speed] || SPEED_MAP[currentSpeed] || SPEED_MAP.normal;
    danmu.style.animationDuration = duration + "s";

    danmu.style.top = getNextLaneTop();

    container.appendChild(danmu);
    activeDanmuCount += 1;

    danmu.addEventListener("animationend", function () {
      activeDanmuCount = Math.max(0, activeDanmuCount - 1);
      danmu.remove();
      drainDanmuQueue();
    });
  }

  function enqueueDanmuEntries(entries) {
    if (!isEnabled || !container || !Array.isArray(entries) || entries.length === 0) {
      return;
    }

    entries.forEach(function (entry) {
      if (pendingDanmu.length >= MAX_QUEUED_DANMU) {
        pendingDanmu.shift();
      }
      pendingDanmu.push(entry);
    });

    drainDanmuQueue();
  }

  function drainDanmuQueue() {
    if (!isEnabled || !container || pendingDanmu.length === 0) {
      return;
    }

    if (activeDanmuCount >= MAX_ACTIVE_DANMU) {
      return;
    }

    const entry = pendingDanmu.shift();
    createDanmu(getDanmuEntryText(entry), entry.contactName, entry.color || "", currentSpeed);

    if (pendingDanmu.length > 0) {
      scheduleDrain();
    }
  }

  function scheduleDrain() {
    if (drainTimerId) {
      return;
    }

    const timeoutFn = typeof setTimeout === "function"
      ? setTimeout
      : function (callback) {
          callback();
          return 0;
        };

    drainTimerId = timeoutFn(function () {
      drainTimerId = null;
      drainDanmuQueue();
    }, DANMU_STAGGER_MS);
  }

  function clearDrainTimer() {
    if (!drainTimerId) {
      return;
    }

    if (typeof clearTimeout === "function") {
      clearTimeout(drainTimerId);
    }
    drainTimerId = null;
  }

  function getNextLaneTop() {
    const lane = laneCursor % LANE_COUNT;
    laneCursor += 1;
    return lane * (100 / LANE_COUNT) + "%";
  }

  function getDanmuEntryText(entry) {
    if (bookmarkDataApi && typeof bookmarkDataApi.getIncomingEventText === "function") {
      const resolved = bookmarkDataApi.getIncomingEventText(entry);
      if (resolved) {
        return resolved;
      }
    }

    const message = (entry && entry.message) || {};
    const text = (
      (entry && entry.text) ||
      message.text ||
      message.fallbackText ||
      ""
    ).trim();

    if (text) {
      return text;
    }

    if (message.kind && message.kind !== "text") {
      return "[" + String(message.kind).charAt(0).toUpperCase() + String(message.kind).slice(1) + "]";
    }

    return "";
  }

  function clearAll() {
    if (!container) {
      return;
    }

    container.innerHTML = "";
    pendingDanmu = [];
    activeDanmuCount = 0;
    clearDrainTimer();
  }

  async function autoInit() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.local ||
      !document.body
    ) {
      return;
    }

    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = result[SETTINGS_KEY] || {};
      init(settings.danmuModeEnabled, settings.danmuSpeed);
    } catch (error) {
      init(false, "normal");
    }

    listenForStorageChanges();
  }

  function listenForStorageChanges() {
    if (
      storageListenerInstalled ||
      !chrome.storage.onChanged ||
      typeof chrome.storage.onChanged.addListener !== "function"
    ) {
      return;
    }

    chrome.storage.onChanged.addListener(function (changes, areaName) {
      if (areaName !== "local") {
        return;
      }

      if (changes[SETTINGS_KEY]) {
        const settings = changes[SETTINGS_KEY].newValue || {};
        init(settings.danmuModeEnabled, settings.danmuSpeed);
      }

      if (!isEnabled) {
        return;
      }

      if (changes[INCOMING_EVENTS_KEY]) {
        enqueueDanmuEntries(
          bookmarkDataApi.getNewIncomingEventEntries(
            changes[INCOMING_EVENTS_KEY].oldValue,
            changes[INCOMING_EVENTS_KEY].newValue
          )
        );
        return;
      }

      if (!changes[DATA_KEY]) {
        return;
      }

      const dashboardApi = globalThis.WhatsAppBlurDashboardData;
      if (!dashboardApi || typeof dashboardApi.getNewIncomingMessages !== "function") {
        return;
      }

      enqueueDanmuEntries(
        dashboardApi
          .getNewIncomingMessages(
          changes[DATA_KEY].oldValue,
          changes[DATA_KEY].newValue
          )
          .map(function (entry) {
            return {
              chatId: entry.chatId,
              contactName: entry.contactName,
              text: entry.message && entry.message.text,
              source: "message",
              message: entry.message
            };
          })
      );
    });
    storageListenerInstalled = true;
  }

  if (typeof chrome !== "undefined") {
    autoInit();
  }

  return {
    init,
    createDanmu,
    clearAll,
    autoInit
  };
});
