(function () {
  if (typeof importScripts === "function") {
    importScripts(
      "src/shared/settings.js",
      "src/shared/runtime.js",
      "src/shared/morse-code.js",
      "src/shared/bookmark-data.js",
      "src/content/dashboard-data.js"
    );
  }

  const settingsApi = globalThis.WhatsAppBlurSettings || {
    mergeSettings: function (raw) {
      return raw || {};
    }
  };
  const runtimeApi = globalThis.WhatsAppBlurRuntime || {
    MESSAGE_TYPES: {
      showAllTemporarily: "WHATSAPP_BLUR_SHOW_ALL_TEMPORARILY"
    }
  };
  const WHATSAPP_MATCH = "https://web.whatsapp.com/*";
  const WHATSAPP_URL = "https://web.whatsapp.com/";
  const FORWARDED_TYPES = new Set([
    "BOOKMARK_BAR_REQUEST_CHATS",
    "BOOKMARK_BAR_SEND",
    "BOOKMARK_BAR_SWITCH_CHAT"
  ]);
  const STATUS_TYPE = "BOOKMARK_BAR_STATUS";
  const KEEP_ALIVE_CHANGED_TYPE = "KEEP_WHATSAPP_ALIVE_CHANGED";
  const KEEP_ALIVE_ALARM_NAME = "wa-bookmark-keep-alive";
  const KEEP_ALIVE_INTERVAL_MINUTES = 1;
  const SETTINGS_KEY = "waPrivacyBlurSettings";
  const TOGGLE_BOOKMARK_COMMAND = "toggle-bookmark-bar";
  const TEMPORARY_REVEAL_COMMAND = "temporary-reveal";
  const TOGGLE_BOSS_KEY_COMMAND = "toggle-boss-key";
  const MORSE_NOTIFY_TYPE =
    runtimeApi.MESSAGE_TYPES.morseNotify || "WHATSAPP_BLUR_MORSE_NOTIFY";
  const BOOKMARK_DATA_KEY = "waBookmarkBarData";
  const bookmarkDataApi = globalThis.WhatsAppBookmarkData || {
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
    }
  };
  const INCOMING_EVENTS_KEY =
    bookmarkDataApi.INCOMING_EVENTS_KEY || "waIncomingMessageEvents";

  if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) {
    return;
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message && message.type === STATUS_TYPE) {
      checkBookmarkBarAvailability()
        .then(function (available) {
          sendResponse({ ok: true, available: available });
        })
        .catch(function () {
          sendResponse({ ok: true, available: false });
        });

      return true;
    }

    if (message && message.type === KEEP_ALIVE_CHANGED_TYPE) {
      updateKeepAliveAlarm(!!message.keepWhatsAppAlive)
        .then(function () {
          sendResponse({ ok: true });
        })
        .catch(function (error) {
          sendResponse({
            ok: false,
            error: error && error.message ? error.message : String(error)
          });
        });

      return true;
    }

    if (message && message.type === MORSE_NOTIFY_TYPE) {
      handleMorseNotify(message);
      return;
    }

    if (!message || !FORWARDED_TYPES.has(message.type)) {
      return;
    }

    forwardToWhatsApp(message, sender)
      .then(function (response) {
        if (response && typeof response === "object" && typeof response.ok === "boolean") {
          sendResponse(response);
          return;
        }

        sendResponse({ ok: true });
      })
      .catch(function (error) {
        sendResponse({
          ok: false,
          error: error && error.message ? error.message : String(error)
        });
      });

    return true;
  });

  if (chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener(function (command) {
      if (command === TOGGLE_BOOKMARK_COMMAND) {
        toggleBookmarkBarFromShortcut().catch(function () {
          // ignore
        });
        return;
      }

      if (command === TEMPORARY_REVEAL_COMMAND) {
        triggerTemporaryRevealFromShortcut().catch(function () {
          // ignore
        });
        return;
      }

      if (command === TOGGLE_BOSS_KEY_COMMAND) {
        toggleBossKeyFromShortcut().catch(function () {
          // ignore
        });
      }
    });
  }

  if (
    chrome.storage &&
    chrome.storage.onChanged &&
    typeof chrome.storage.onChanged.addListener === "function"
  ) {
    chrome.storage.onChanged.addListener(onStorageChanged);
  }

  if (chrome.alarms) {
    chrome.alarms.onAlarm.addListener(function (alarm) {
      if (alarm && alarm.name === KEEP_ALIVE_ALARM_NAME) {
        runBackgroundSync().catch(function () {
          // ignore
        });
      }
    });
  }

  if (chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(syncKeepAliveFromSettings);
  }
  if (chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(syncKeepAliveFromSettings);
  }

  async function syncKeepAliveFromSettings() {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = settingsApi.mergeSettings(result && result[SETTINGS_KEY] ? result[SETTINGS_KEY] : {});
      await updateKeepAliveAlarm(!!settings.keepWhatsAppAlive);
    } catch (e) {
      // ignore
    }
  }

  async function toggleBossKeyFromShortcut() {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = settingsApi.mergeSettings(result && result[SETTINGS_KEY] ? result[SETTINGS_KEY] : {});
    if (!settings.bossKeyEnabled) {
      return;
    }

    await sendMessageToWhatsApp({
      type: runtimeApi.MESSAGE_TYPES.bossKeyToggle
    });
  }

  async function toggleBookmarkBarFromShortcut() {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = settingsApi.mergeSettings(result && result[SETTINGS_KEY] ? result[SETTINGS_KEY] : {});
    const nextEnabled = !settings.bookmarkBarEnabled;

    await chrome.storage.local.set({
      [SETTINGS_KEY]: Object.assign({}, settings, {
        bookmarkBarEnabled: nextEnabled
      })
    });
  }

  async function triggerTemporaryRevealFromShortcut() {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = settingsApi.mergeSettings(result && result[SETTINGS_KEY] ? result[SETTINGS_KEY] : {});
    const durationSeconds =
      typeof settings.temporaryRevealSeconds === "number" && settings.temporaryRevealSeconds > 0
        ? settings.temporaryRevealSeconds
        : 5;
    const durationMs = durationSeconds * 1000;

    await sendTemporaryRevealToWhatsApp(durationMs);
  }

  async function updateKeepAliveAlarm(enabled) {
    if (!chrome.alarms) {
      return;
    }

    if (enabled) {
      await chrome.alarms.create(KEEP_ALIVE_ALARM_NAME, {
        periodInMinutes: KEEP_ALIVE_INTERVAL_MINUTES
      });
      await runBackgroundSync();
    } else {
      try {
        await chrome.alarms.clear(KEEP_ALIVE_ALARM_NAME);
      } catch (e) {
        // ignore
      }
    }
  }

  async function runBackgroundSync() {
    const result = await ensureWhatsAppTabExists();
    if (!result || !result.tab || typeof result.tab.id !== "number") {
      return;
    }

    if (result.reloaded) {
      // The tab was just reloaded, so the content script is not ready yet.
      // The next alarm tick will pick it up once WhatsApp Web has loaded.
      return;
    }

    try {
      await chrome.tabs.sendMessage(result.tab.id, { type: "BOOKMARK_BAR_SYNC" });
    } catch (e) {
      // The content script may not be ready yet (e.g. WhatsApp is still loading).
      // The periodic alarm will retry on the next tick.
    }
  }

  async function ensureWhatsAppTabExists() {
    const tabs = await chrome.tabs.query({ url: WHATSAPP_MATCH });

    if (Array.isArray(tabs) && tabs.length > 0) {
      const usable = tabs.find(function (t) {
        return !t.discarded;
      });
      if (usable) {
        return { tab: usable, reloaded: false };
      }
      // All existing tabs are discarded; reload the first one and let the next
      // alarm tick communicate with the freshly-injected content script.
      const first = tabs[0];
      if (first && typeof first.id === "number") {
        try {
          await chrome.tabs.reload(first.id, { bypassCache: false });
        } catch (e) {
          // ignore
        }
        return { tab: first, reloaded: true };
      }
    }

    const window = await chrome.windows.create({
      url: WHATSAPP_URL,
      state: "minimized",
      focused: false
    });

    if (window && Array.isArray(window.tabs) && window.tabs.length > 0) {
      // A brand-new window needs time to load WhatsApp Web; skip the first sync.
      return { tab: window.tabs[0], reloaded: true };
    }

    return null;
  }

  async function forwardToWhatsApp(message, sender) {
    const tabs = await chrome.tabs.query({ url: WHATSAPP_MATCH });
    const targetTab = pickTargetTab(tabs, sender && sender.tab);

    if (!targetTab || typeof targetTab.id !== "number") {
      throw new Error("WhatsApp Web is not open");
    }

    return chrome.tabs.sendMessage(targetTab.id, message);
  }

  async function sendTemporaryRevealToWhatsApp(durationMs) {
    await sendMessageToWhatsApp({
      type: runtimeApi.MESSAGE_TYPES.showAllTemporarily,
      durationMs: durationMs
    });
  }

  async function sendMessageToWhatsApp(message) {
    const tabs = await chrome.tabs.query({ url: WHATSAPP_MATCH });
    if (!Array.isArray(tabs) || tabs.length === 0) {
      return;
    }

    const targetTab = tabs.find(function (tab) {
      return tab.active;
    }) || tabs[0];

    if (!targetTab || typeof targetTab.id !== "number") {
      return;
    }

    try {
      await chrome.tabs.sendMessage(targetTab.id, message);
    } catch (e) {
      // ignore
    }
  }

  async function checkBookmarkBarAvailability() {
    const tabs = await chrome.tabs.query({ url: WHATSAPP_MATCH });
    return Array.isArray(tabs) && tabs.length > 0;
  }

  const morseQueue = [];
  let morsePlaying = false;
  const MORSE_DOT_MS = 400;
  const MORSE_DASH_MS = 1200;
  const MORSE_GAP_MS = 300;
  const MORSE_CHAR_GAP_MS = 600;
  const MORSE_BADGE_COLOR = "#00aa00";
  function setMorseBadge(text) {
    if (chrome.action) {
      if (chrome.action.setBadgeText) {
        chrome.action.setBadgeText({ text: text });
      }
      if (chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({
          color: text ? MORSE_BADGE_COLOR : "#000000"
        });
      }
    }
  }

  function handleMorseNotify(message) {
    if (!message || !message.contactName) {
      return;
    }

    const morseApi = globalThis.WhatsAppBlurMorseCode || { textToMorse: function () { return ""; } };
    const morse = morseApi.textToMorse(message.contactName);

    if (!morse) {
      return;
    }

    morseQueue.push(morse);
    if (!morsePlaying) {
      playNextMorse();
    }
  }

  async function onStorageChanged(changes, areaName) {
    if (
      areaName !== "local" ||
      !changes ||
      (!changes[BOOKMARK_DATA_KEY] && !changes[INCOMING_EVENTS_KEY])
    ) {
      return;
    }

    const dashboardApi = globalThis.WhatsAppBlurDashboardData;
    if (!dashboardApi || typeof dashboardApi.getNewIncomingMessages !== "function") {
      return;
    }

    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = settingsApi.mergeSettings(
        result && result[SETTINGS_KEY] ? result[SETTINGS_KEY] : {}
      );
      if (!settings.morseNotificationsEnabled) {
        return;
      }

      const filter = (settings.morseContact || "").trim().toLowerCase();
      const incomingEntries = changes[INCOMING_EVENTS_KEY]
        ? bookmarkDataApi.getNewIncomingEventEntries(
            changes[INCOMING_EVENTS_KEY].oldValue,
            changes[INCOMING_EVENTS_KEY].newValue
          )
        : dashboardApi.getNewIncomingMessages(
            changes[BOOKMARK_DATA_KEY].oldValue,
            changes[BOOKMARK_DATA_KEY].newValue
          );

      incomingEntries
        .filter(function (entry) {
          return !filter || String(entry.contactName || "").trim().toLowerCase() === filter;
        })
        .forEach(function (entry) {
          handleMorseNotify({ contactName: entry.contactName });
        });
    } catch (error) {
      // Ignore storage races while the service worker is waking up.
    }
  }

  function playNextMorse() {
    if (morseQueue.length === 0) {
      morsePlaying = false;
      setMorseBadge("");
      return;
    }

    morsePlaying = true;
    const morse = morseQueue.shift();
    const words = morse.split(" ");
    let wordIndex = 0;

    function playWord() {
      if (wordIndex >= words.length) {
        setMorseBadge("");
        setTimeout(playNextMorse, MORSE_CHAR_GAP_MS);
        return;
      }

      const sequence = words[wordIndex].split("");
      let index = 0;
      wordIndex += 1;

      function step() {
        if (index >= sequence.length) {
          setMorseBadge("");
          setTimeout(playWord, MORSE_CHAR_GAP_MS);
          return;
        }

        const symbol = sequence[index];
        const isDash = symbol === "-";
        const duration = isDash ? MORSE_DASH_MS : MORSE_DOT_MS;

        setMorseBadge(symbol);

        index += 1;
        setTimeout(function () {
          setMorseBadge("");
          setTimeout(step, MORSE_GAP_MS);
        }, duration);
      }

      step();
    }

    playWord();
  }

  function pickTargetTab(tabs, senderTab) {
    if (!Array.isArray(tabs) || tabs.length === 0) {
      return null;
    }

    if (senderTab && typeof senderTab.windowId === "number") {
      const activeInSameWindow = tabs.find(function (tab) {
        return tab.windowId === senderTab.windowId && tab.active;
      });

      if (activeInSameWindow) {
        return activeInSameWindow;
      }

      const firstInSameWindow = tabs.find(function (tab) {
        return tab.windowId === senderTab.windowId;
      });

      if (firstInSameWindow) {
        return firstInSameWindow;
      }
    }

    return tabs.find(function (tab) {
      return tab.active;
    }) || tabs[0];
  }
})();
