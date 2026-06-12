(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBookmarkBar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DATA_KEY = "waBookmarkBarData";
  const SETTINGS_KEY = "waPrivacyBlurSettings";
  const BAR_ID = "wa-bookmark-bar";
  const PANEL_CLASS = "wa-bookmark-bar__panel";
  const ACTIVE_CLASS = "wa-bookmark-bar-active";
  const THEME_ATTRIBUTE = "data-wa-bookmark-theme";
  const MEDIA_ASSET_MAX_DIMENSION = 720;
  const STICKER_ASSET_MAX_DIMENSION = 512;
  const MEDIA_ASSET_MAX_DATA_URL_LENGTH = 900000;
  const MEDIA_ZOOM_ASSET_MAX_DIMENSION = 2048;
  const STICKER_ZOOM_ASSET_MAX_DIMENSION = 1024;
  const MEDIA_ZOOM_ASSET_MAX_DATA_URL_LENGTH = 4500000;
  const settingsApi =
    (typeof globalThis !== "undefined" && globalThis.WhatsAppBlurSettings) || {
      mergeSettings: function (raw) {
        const source = raw || {};
        return {
          enabled: source.enabled !== false,
          hoverReveal: source.hoverReveal !== false,
          holdRevealEnabled: source.holdRevealEnabled === true,
          idleBlurEnabled: source.idleBlurEnabled === true,
          idleTimeoutMs: typeof source.idleTimeoutMs === "number" ? source.idleTimeoutMs : 30000,
          temporaryRevealSeconds:
            typeof source.temporaryRevealSeconds === "number" ? source.temporaryRevealSeconds : 5,
          bookmarkBarEnabled: source.bookmarkBarEnabled === true,
          keepWhatsAppAlive: source.keepWhatsAppAlive === true,
          activePreset: typeof source.activePreset === "string" ? source.activePreset : "custom",
          bookmarkBarTheme:
            typeof source.bookmarkBarTheme === "string" ? source.bookmarkBarTheme : "classic",
          pinnedContacts: Array.isArray(source.pinnedContacts) ? source.pinnedContacts.slice() : [],
          contactAliases:
            source.contactAliases && typeof source.contactAliases === "object" && !Array.isArray(source.contactAliases)
              ? Object.keys(source.contactAliases).reduce(function (accumulator, key) {
                  const alias = source.contactAliases[key];
                  if (typeof alias === "string" && key.trim() && alias.trim()) {
                    accumulator[key.trim()] = alias.trim();
                  }
                  return accumulator;
                }, {})
              : {},
          pinnedContactGroups: Array.isArray(source.pinnedContactGroups)
            ? source.pinnedContactGroups
                .filter(function (group) {
                  return group && typeof group.name === "string";
                })
                .map(function (group) {
                  return {
                    name: group.name.trim(),
                    contacts: Array.isArray(group.contacts)
                      ? group.contacts
                          .map(function (contact) {
                            return typeof contact === "string" ? contact.trim() : "";
                          })
                          .filter(function (contact) {
                            return contact.length > 0;
                          })
                      : []
                  };
                })
            : [],
          bookmarkBarColor:
            typeof source.bookmarkBarColor === "string" && source.bookmarkBarColor.length > 0
              ? source.bookmarkBarColor
              : "#f1f3f4",
          blurTargets:
            source.blurTargets && typeof source.blurTargets === "object"
              ? source.blurTargets
              : {
                  contactList: true,
                  chatText: true,
                  avatars: true,
                  previewText: true,
                  mediaPreviews: true,
                  voiceMessages: true,
                  timestamps: false,
                  otherUi: false
                }
        };
      }
    };
  const bookmarkDataApi =
    (typeof globalThis !== "undefined" && globalThis.WhatsAppBookmarkData) || {
      MAX_CACHED_MESSAGES: 20,
      normalizeBookmarkData: function (raw) {
        const source = raw || {};
        return {
          chats: Array.isArray(source.chats) ? source.chats.slice() : [],
          messagesByChatId:
            source.messagesByChatId && typeof source.messagesByChatId === "object"
              ? source.messagesByChatId
              : {},
          updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : 0,
          sourceTabAvailable: source.sourceTabAvailable === true
        };
      },
      appendCachedMessage: function (raw, chatId, message) {
        const data = this.normalizeBookmarkData(raw);
        const existing = Array.isArray(data.messagesByChatId[chatId])
          ? data.messagesByChatId[chatId].slice()
          : [];
        existing.push(message);
        data.messagesByChatId[chatId] = existing.slice(-this.MAX_CACHED_MESSAGES);
        return data;
      }
    };
  const INCOMING_EVENTS_KEY =
    bookmarkDataApi.INCOMING_EVENTS_KEY || "waIncomingMessageEvents";

  const isWhatsApp = location.hostname === "web.whatsapp.com";

  const EMOJI_CATEGORIES = [
    {
      label: "Frequently used",
      emojis: "😂❤️😍🤣😊🙏💕😭😘👍😅👏🔥💔😢🤔😆🙄💜😴💖💙😁🎉✨🤷🤗"
    },
    {
      label: "Smileys",
      emojis: "😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑😬🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾"
    },
    {
      label: "Gestures",
      emojis: "👋🤚🖐️✋🖖👌🤌🤏✌️🤞🤟🤘🤙👈👉👆🖕👇☝️👍👎✊👊🤛🤜👏🙌👐🤲🤝🙏💪🦾✍️💅🤳"
    },
    {
      label: "Hearts",
      emojis: "❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟🏳️‍🌈"
    },
    {
      label: "Symbols",
      emojis: "💯🔥✨🎉🎊🎁🎈🌟⭐🌙☀️☁️⛈️🌧️❄️🌈⚡💧🔔📣🎵🎶⏰🕰️💣🧨💊💉🚫⚠️❓❗"
    },
    {
      label: "Food",
      emojis: "🍎🍌🍇🍉🍓🍒🍑🍍🥝🍐🍊🍋🥭🍈🍏🍅🥑🍆🥔🥕🌽🌶️🥒🥬🥦🍄🥜🌰🍞🥐🥖🥨🥯🥞🧇🧀🍖🍗🥩🥓🍔🍟🍕🌭🥪🌮🌯🥙🥚🍳🥘🍲🥣🥗🍿🧈🥫🍱🍘🍙🍚🍛🍜🍝🍠🍢🍣🍤🍥🍡🍦🍧🍨🍩🍪🎂🍰🧁🥧🍫🍬🍭🍮🍯🍼🥛☕🍵🧃🥤🧋🍶🍾🍷🍸🍹🍺🍻🥂🥃🧊🥄🍴🍽️🥡🥢"
    }
  ];

  let barElement = null;
  let activePanel = null;
  let activeChatId = null;
  let updateIntervalId = null;
  let storageListenerInstalled = false;
  let cachedBookmarkData = bookmarkDataApi.normalizeBookmarkData();
  let cachedUiSettings = settingsApi.mergeSettings();
  let currentSendAvailability = null;
  let panelSendFeedback = "";
  let pendingSendCount = 0;
  let sendQueue = Promise.resolve();
  let mediaZoomOverlay = null;

  // Auto-init on load
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    autoInit();
  }

  async function autoInit() {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = result[SETTINGS_KEY] || {};
      if (settings.bookmarkBarEnabled) {
        create();
      }
      listenSettingsChanges();
    } catch (e) {
      // Silent fail in test or restricted environments
    }
  }

  function listenSettingsChanges() {
    if (storageListenerInstalled) return;
    if (!chrome.storage || !chrome.storage.onChanged) return;

    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local") return;
      if (changes[SETTINGS_KEY]) {
        const newSettings = settingsApi.mergeSettings(changes[SETTINGS_KEY].newValue || {});
        cachedUiSettings = newSettings;
        if (newSettings.bookmarkBarEnabled) {
          create();
        } else {
          destroy();
        }
        if (barElement) {
          applyBarAppearance(newSettings);
          if (isWhatsApp) {
            updateFromWhatsApp();
          } else {
            updateFromStorage();
          }
        }
      }
      if (changes[DATA_KEY] && !isWhatsApp && barElement) {
        updateFromStorage();
      }
    });
    storageListenerInstalled = true;
  }

  async function applyStoredBarAppearance() {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = settingsApi.mergeSettings(result[SETTINGS_KEY] || {});
      cachedUiSettings = settings;
      applyBarAppearance(settings);
    } catch (e) {}
  }

  function applyThemeVariables(target, settings) {
    if (!target || !target.style) return;

    const normalized = settingsApi.mergeSettings(settings || {});
    const theme = normalized.bookmarkBarTheme || "classic";
    const themeVariables =
      theme === "sunset"
        ? {
            "--wa-bookmark-bar-bg": "#fff2e4",
            "--wa-bookmark-bar-border": "#f0c9a6",
            "--wa-bookmark-bar-text": "#5a402e",
            "--wa-bookmark-bar-hover": "#f7d7b6",
            "--wa-bookmark-bar-active": "#efc08d",
            "--wa-bookmark-bar-label": "#8a5a37",
            "--wa-bookmark-bar-accent": "#00a884",
            "--wa-bookmark-bar-panel-bg": "#ffffff",
            "--wa-bookmark-bar-panel-alt": "#fff8f0"
          }
        : theme === "midnight"
          ? {
              "--wa-bookmark-bar-bg": "#1f2430",
              "--wa-bookmark-bar-border": "#394155",
              "--wa-bookmark-bar-text": "#e7ebf4",
              "--wa-bookmark-bar-hover": "#2d3444",
              "--wa-bookmark-bar-active": "#384255",
              "--wa-bookmark-bar-label": "#9da8bd",
              "--wa-bookmark-bar-accent": "#78e7ff",
              "--wa-bookmark-bar-panel-bg": "#ffffff",
              "--wa-bookmark-bar-panel-alt": "#262c3a"
            }
          : theme === "paper"
            ? {
                "--wa-bookmark-bar-bg": "#faf7f0",
                "--wa-bookmark-bar-border": "#e4dccb",
                "--wa-bookmark-bar-text": "#4a4338",
                "--wa-bookmark-bar-hover": "#e8dfcf",
                "--wa-bookmark-bar-active": "#d8ccb5",
                "--wa-bookmark-bar-label": "#7a6c56",
                "--wa-bookmark-bar-accent": "#00a884",
                "--wa-bookmark-bar-panel-bg": "#ffffff",
                "--wa-bookmark-bar-panel-alt": "#f7f2ea"
              }
            : {
                "--wa-bookmark-bar-bg": "#f1f3f4",
                "--wa-bookmark-bar-border": "#dadce0",
                "--wa-bookmark-bar-text": "#3c4043",
                "--wa-bookmark-bar-hover": "#dadce0",
                "--wa-bookmark-bar-active": "#c6cacf",
                "--wa-bookmark-bar-label": "#5f6368",
                "--wa-bookmark-bar-accent": "#00a884",
                "--wa-bookmark-bar-panel-bg": "#ffffff",
                "--wa-bookmark-bar-panel-alt": "#f8f9fa"
              };

    if (typeof target.style.setProperty === "function") {
      Object.entries(themeVariables).forEach(function ([name, value]) {
        target.style.setProperty(name, value);
      });
    } else {
      Object.entries(themeVariables).forEach(function ([name, value]) {
        target.style[name] = value;
      });
    }

    target.dataset.theme = theme;
    target.setAttribute(THEME_ATTRIBUTE, theme);
  }

  function applyBarAppearance(settings) {
    if (!barElement && !activePanel) return;
    const normalized = settingsApi.mergeSettings(settings || {});
    if (barElement) {
      applyThemeVariables(barElement, normalized);
      barElement.style.backgroundColor = normalized.bookmarkBarColor || "#f1f3f4";
    }
    if (activePanel) {
      applyThemeVariables(activePanel, normalized);
    }
  }

  function create() {
    if (barElement) return;

    barElement = document.createElement("div");
    barElement.id = BAR_ID;
    barElement.className = "wa-bookmark-bar";

    applyStoredBarAppearance();

    document.body.appendChild(barElement);
    document.documentElement.classList.add(ACTIVE_CLASS);

    if (isWhatsApp) {
      updateFromWhatsApp();
      updateIntervalId = window.setInterval(updateFromWhatsApp, 3000);
    } else {
      updateFromStorage();
      updateIntervalId = window.setInterval(updateFromStorage, 3000);
    }

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeydown);
  }

  function destroy() {
    document.removeEventListener("click", onDocumentClick);
    document.removeEventListener("keydown", onDocumentKeydown);

    if (updateIntervalId) {
      window.clearInterval(updateIntervalId);
      updateIntervalId = null;
    }

    closePanel();
    closeMediaZoom();

    if (barElement) {
      barElement.remove();
      barElement = null;
    }

    document.documentElement.classList.remove(ACTIVE_CLASS);
  }

  function isActive() {
    return !!barElement;
  }

  // ─── WhatsApp page: extract and persist ───

  async function updateFromWhatsApp() {
    try {
      const chats = extractChatsFromWhatsApp();
      const settings = await readBookmarkSettings();
      cachedUiSettings = settings;
      applyBarAppearance(settings);
      renderBookmarks(chats, settings);

      // Persist pure data (without DOM elements) for other pages
      const pureChats = chats.map(function (c) {
        return {
          id: c.id,
          name: c.name,
          preview: c.preview,
          avatar: c.avatar,
          hasUnread: c.hasUnread,
          isPinned: c.isPinned
        };
      });

      try {
        if (pureChats.length > 0) {
          await persistChatList(pureChats);
        }
      } catch (e) {}

      // Continuously sync messages for the currently-selected chat so background
      // tabs and other pages can display up-to-date history without the user
      // keeping the panel open.
      try {
        const selectedChat =
          chats.find(function (c) {
            return isChatRowSelected(c);
          }) ||
          chats.find(function (c) {
            return isMainPanelShowingChat(c);
          });
        if (selectedChat && selectedChat.id && isMainPanelShowingChat(selectedChat)) {
          const messages = extractMessagesFromMainPanel();
          if (messages.length > 0) {
            await persistChatMessages(selectedChat.id, messages);
          }
        }
      } catch (e) {}
    } catch (error) {
      if (!isExtensionContextInvalidatedError(error)) {
        console.error("BookmarkBar: update error", error);
      }
    }
  }

  function extractChatsFromWhatsApp() {
    const chats = [];
    const seenContainers = new Set();
    const titleMatches = document.querySelectorAll(
      '#pane-side [data-testid="cell-frame-title"], #pane-side [data-testid="cell-frame-title"] span[dir="auto"]'
    );

    titleMatches.forEach(function (match, index) {
      const titleEl =
        typeof match.closest === "function"
          ? match.closest('[data-testid="cell-frame-title"]') || match
          : match;
      if (!titleEl) return;

      const item = findChatContainer(titleEl);
      if (!item) return;
      if (seenContainers.has(item)) return;
      seenContainers.add(item);

      const name = extractChatName(titleEl);
      if (!name) return;

      const previewEl =
        typeof item.querySelector === "function"
          ? item.querySelector('[data-testid="cell-frame-secondary"]')
          : null;
      const preview = previewEl ? previewEl.textContent.trim() : "";

      const avatarImg = typeof item.querySelector === "function" ? item.querySelector("img") : null;
      const avatar = avatarImg ? avatarImg.src : null;

      const chatId = resolveChatId(item, titleEl, name, index);

      chats.push({
        id: chatId,
        name: name,
        preview: preview,
        avatar: avatar,
        hasUnread: detectUnreadMessage(item),
        isPinned: detectPinnedChat(item),
        element: item
      });
    });

    return chats;
  }

  function extractChatName(titleEl) {
    if (!titleEl) {
      return "";
    }

    if (typeof titleEl.querySelector === "function") {
      const nameNode = titleEl.querySelector('span[dir="auto"]');
      if (nameNode) {
        const titledName = getAttributeValue(nameNode, "title");
        const visibleName = (nameNode.textContent || "").trim();
        if (titledName || visibleName) {
          return (titledName || visibleName).trim();
        }
      }

      const titledNode = titleEl.querySelector("[title]");
      const titledName = getAttributeValue(titledNode, "title");
      if (titledName) {
        return titledName.trim();
      }
    }

    const ownTitle = getAttributeValue(titleEl, "title");
    if (ownTitle) {
      return ownTitle.trim();
    }

    return stripUnreadAccessibilityPrefix(titleEl.textContent || "");
  }

  function stripUnreadAccessibilityPrefix(value) {
    return String(value || "")
      .trim()
      .replace(
        /^\d+\s*(?:(?:条|條|則|个|個)\s*)?(?:未读消息|未讀消息|未读讯息|未讀訊息|unread messages?)\s*/i,
        ""
      )
      .trim();
  }

  function hasUnreadLabel(value) {
    const label = String(value || "").trim();
    if (!label) {
      return false;
    }

    return (
      /\b(?:unread|unseen)\b/i.test(label) ||
      /未\s*[读讀]\s*(?:消息|讯息|訊息)?/i.test(label) ||
      /\d+\s*(?:(?:条|條|則|个|個)\s*)?(?:未读消息|未讀消息|未读讯息|未讀訊息)/i.test(label)
    );
  }

  function detectUnreadMessage(item) {
    if (!item || typeof item.querySelector !== "function") {
      return false;
    }

    // Strategy 1: explicit unread-count badges (known exact testids).
    const exactBadgeSelectors = [
      '[data-testid="icon-meta-count"]',
      '[data-testid="meta-count"]',
      '[data-testid="unread-count"]',
      '[data-testid="notification-count"]',
      '[data-testid="message-count"]',
      '[data-testid="badge-count"]'
    ];
    for (let i = 0; i < exactBadgeSelectors.length; i += 1) {
      if (item.querySelector(exactBadgeSelectors[i]) !== null) {
        return true;
      }
    }

    // Strategy 2: any descendant data-testid suggesting unread / badge / notification.
    const testidEls = item.querySelectorAll("[data-testid]");
    for (let i = 0; i < testidEls.length; i += 1) {
      const testid = testidEls[i].getAttribute("data-testid") || "";
      if (/\b(unread|badge|count|notification|meta-count|message-count)\b/i.test(testid)) {
        return true;
      }
    }

    // Strategy 3: any descendant whose aria-label mentions unread.
    const elsWithLabel = item.querySelectorAll('[aria-label]');
    for (let i = 0; i < elsWithLabel.length; i += 1) {
      const label = elsWithLabel[i].getAttribute("aria-label") || "";
      if (hasUnreadLabel(label)) {
        return true;
      }
    }

    // Strategy 4: the item's own aria-label.
    try {
      const ariaLabel = item.getAttribute("aria-label");
      if (hasUnreadLabel(ariaLabel)) {
        return true;
      }
    } catch (e) {}

    if (hasUnreadLabel(item.textContent || "")) {
      return true;
    }

    // Strategy 5: green dot / unread indicator icons.
    const iconSelectors = [
      '[data-testid="icon-unread"]',
      '[data-testid="status-unread"]',
      '[data-icon="unread"]',
      '[data-icon="status-unread"]'
    ];
    for (let i = 0; i < iconSelectors.length; i += 1) {
      if (item.querySelector(iconSelectors[i]) !== null) {
        return true;
      }
    }

    // Strategy 6: any descendant data-icon suggesting unread / badge.
    const iconEls = item.querySelectorAll("[data-icon]");
    for (let i = 0; i < iconEls.length; i += 1) {
      const icon = iconEls[i].getAttribute("data-icon") || "";
      if (/\b(unread|badge|count|notification)\b/i.test(icon)) {
        return true;
      }
    }

    // Strategy 7: class names that suggest unread / notification / badge.
    const allEls = item.querySelectorAll("*");
    for (let i = 0; i < allEls.length; i += 1) {
      const cls = allEls[i].className || "";
      if (typeof cls === "string" && /\b(unread|badge|count|notification|new-message|unseen)\b/i.test(cls)) {
        return true;
      }
    }

    // Strategy 8: look for numeric text nodes that look like an unread count
    // (single or double digits, often inside a small circular badge).
    const numericSpans = item.querySelectorAll("span, div");
    for (let i = 0; i < numericSpans.length; i += 1) {
      const text = (numericSpans[i].textContent || "").trim();
      // Matches numbers 1-999 (WhatsApp caps at 999+)
      if (/^[1-9]\d{0,2}$/.test(text) || text === "999+") {
        const el = numericSpans[i];
        const rect = typeof el.getBoundingClientRect === "function" ? el.getBoundingClientRect() : null;
        // Small square-ish element ~14-24px is likely a badge
        if (rect && rect.width > 10 && rect.width < 30 && rect.height > 10 && rect.height < 30) {
          return true;
        }
      }
    }

    return false;
  }

  function detectPinnedChat(item) {
    if (!item || typeof item.querySelector !== "function") {
      return false;
    }

    // Strategy 1: known exact testids.
    const exactSelectors = [
      '[data-testid="pin"]',
      '[data-testid="status-pin"]',
      '[data-testid="icon-pin"]',
      '[data-testid="pinned"]'
    ];
    for (let i = 0; i < exactSelectors.length; i += 1) {
      if (item.querySelector(exactSelectors[i]) !== null) {
        return true;
      }
    }

    // Strategy 2: any descendant whose data-testid contains the word "pin".
    // We use \bpin\b to avoid matching "spin", "spine", "pink", etc.
    const testidEls = item.querySelectorAll("[data-testid]");
    for (let i = 0; i < testidEls.length; i += 1) {
      const testid = testidEls[i].getAttribute("data-testid") || "";
      if (/\bpin\b/i.test(testid)) {
        return true;
      }
    }

    // Strategy 3: any descendant aria-label contains "pinned".
    const labelEls = item.querySelectorAll("[aria-label]");
    for (let i = 0; i < labelEls.length; i += 1) {
      const label = labelEls[i].getAttribute("aria-label") || "";
      if (/\bpinned\b/i.test(label)) {
        return true;
      }
    }

    return false;
  }

  function findChatContainer(node) {
    if (!node || typeof node.closest !== "function") {
      return null;
    }

    // Prefer the most specific container first.
    return (
      node.closest('[data-testid="cell-frame-container"]') ||
      node.closest('[role="listitem"]') ||
      node.closest(".focusable-list-item")
    );
  }

  // ─── Other pages: consume persisted data ───

  async function updateFromStorage() {
    try {
      const settings = await readBookmarkSettings();
      const result = await chrome.storage.local.get(DATA_KEY);
      const data = bookmarkDataApi.normalizeBookmarkData(result[DATA_KEY]);
      cachedBookmarkData = data;
      cachedUiSettings = settings;
      applyBarAppearance(settings);

      if (data.chats.length > 0) {
        renderBookmarks(data.chats, settings);
      } else {
        renderBookmarks([], settings);
        // Ask WhatsApp page to push fresh data
        requestChatsFromWhatsApp();
      }

      // If a chat panel is open, refresh its messages from cache so newly-synced
      // messages appear without requiring the user to close and reopen the panel.
      if (activePanel && activeChatId) {
        const chat = data.chats.find(function (c) {
          return c.id === activeChatId;
        });
        if (chat) {
          refreshPanelMessages(chat);
        }
      }
    } catch (e) {
      cachedBookmarkData = bookmarkDataApi.normalizeBookmarkData();
      renderBookmarks([]);
    }
  }

  async function readBookmarkSettings() {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      return settingsApi.mergeSettings(result[SETTINGS_KEY] || {});
    } catch (e) {
      return settingsApi.mergeSettings(cachedUiSettings);
    }
  }

  async function requestChatsFromWhatsApp() {
    try {
      await chrome.runtime.sendMessage({ type: "BOOKMARK_BAR_REQUEST_CHATS" });
    } catch (e) {}
  }

  // ─── UI Rendering ───

  function renderBookmarks(chats, settings) {
    if (!barElement) return;

    const hadPanel = activePanel && activePanel.isConnected;
    const prevChatId = activeChatId;

    barElement.innerHTML = "";

    const normalizedSettings = settingsApi.mergeSettings(settings || cachedUiSettings);
    cachedUiSettings = normalizedSettings;
    applyBarAppearance(normalizedSettings);

    const pinnedNameSet = Array.isArray(normalizedSettings.pinnedContacts)
      ? new Set(normalizedSettings.pinnedContacts)
      : new Set();
    const groupDefinitions = Array.isArray(normalizedSettings.pinnedContactGroups)
      ? normalizedSettings.pinnedContactGroups
      : [];

    // Show chats that have unread messages, are pinned in WhatsApp,
    // or are manually pinned by the user in the popup.
    let filteredChats = chats.filter(function (c) {
      return (
        c.hasUnread ||
        c.isPinned ||
        pinnedNameSet.has(c.name) ||
        isContactInGroup(c.name, groupDefinitions)
      );
    });

    // If a panel is open for a chat that no longer matches the filter
    // (e.g. it just became read), keep it visible so the panel does not
    // abruptly close while the user is reading it.
    if (hadPanel && prevChatId) {
      const isOpenChatVisible = filteredChats.some(function (c) {
        return c.id === prevChatId;
      });
      if (!isOpenChatVisible) {
        const openChat = chats.find(function (c) {
          return c.id === prevChatId;
        });
        if (openChat) {
          filteredChats = filteredChats.slice();
          filteredChats.push(openChat);
        } else if (activePanel) {
          // The persisted chat list no longer contains this chat (likely
          // because the ID changed when WhatsApp reordered the list).
          // Use the panel header as a fallback so the user can keep reading.
          const titleEl = activePanel.querySelector(
            ".wa-bookmark-bar__panel-title-group span:first-child"
          );
          const fallbackName = titleEl ? titleEl.textContent.trim() : "";
          if (fallbackName) {
            filteredChats = filteredChats.slice();
            filteredChats.push({
              id: prevChatId,
              name: fallbackName,
              displayName: fallbackName,
              preview: "",
              avatar: null,
              hasUnread: false,
              isPinned: false
            });
          }
        }
      }
    }

    if (filteredChats.length === 0) {
      const label = document.createElement("span");
      label.textContent = isWhatsApp
        ? "No pinned or unread conversations"
        : "No cached conversations yet";
      label.style.cssText = "color:#9aa0a6;font-size:12px;padding:0 8px;";
      barElement.appendChild(label);
      // Do NOT close an open panel here; the user may be actively reading it.
      return;
    }

    const renderedChatIds = new Set();
    let renderedGroupCount = 0;

    groupDefinitions.forEach(function (group) {
      const groupChats = filteredChats.filter(function (chat) {
        return groupContainsChat(group, chat.name) && !renderedChatIds.has(chat.id);
      });

      if (groupChats.length === 0) {
        return;
      }

      renderedGroupCount += 1;
      barElement.appendChild(createGroupLabel(group.name));
      groupChats.forEach(function (chat) {
        renderedChatIds.add(chat.id);
        barElement.appendChild(createChatItem(chat, normalizedSettings));
      });
    });

    const remainingChats = filteredChats.filter(function (chat) {
      return !renderedChatIds.has(chat.id);
    });

    if (renderedGroupCount > 0 && remainingChats.length > 0) {
      barElement.appendChild(createGroupLabel("Other"));
    }

    remainingChats.forEach(function (chat) {
      renderedChatIds.add(chat.id);
      barElement.appendChild(createChatItem(chat, normalizedSettings));
    });

    if (hadPanel && prevChatId) {
      const chat = filteredChats.find(function (c) {
        return c.id === prevChatId;
      });
      if (chat) {
        // Refresh the existing panel in place instead of tearing it down.
        if (activePanel && activePanel.isConnected && activeChatId === prevChatId) {
          updatePanelStatus();
          refreshPanelMessages(chat);
        } else {
          openPanel(chat);
        }
      } else {
        closePanel();
      }
    }
  }

  function createGroupLabel(text) {
    const label = document.createElement("div");
    label.className = "wa-bookmark-bar__group-label";
    label.textContent = text;
    return label;
  }

  function createChatItem(chat, settings) {
    const item = document.createElement("div");
    item.className = "wa-bookmark-bar__item";
    item.dataset.chatId = chat.id;
    if (chat.hasUnread) {
      item.dataset.hasUnread = "true";
      item.setAttribute("aria-label", chat.name + " has unread messages");
    }

    const displayName = getDisplayNameForChat(chat.name, settings);
    const presentationChat = Object.assign({}, chat, {
      displayName: displayName
    });

    const avatar = document.createElement(chat.avatar ? "img" : "div");
    avatar.className =
      "wa-bookmark-bar__avatar" +
      (chat.avatar ? "" : " wa-bookmark-bar__avatar--placeholder");
    if (chat.avatar) {
      avatar.src = chat.avatar;
    } else {
      avatar.textContent = displayName.charAt(0).toUpperCase();
    }
    item.appendChild(avatar);

    const text = document.createElement("span");
    text.className = "wa-bookmark-bar__text";
    text.textContent = displayName;
    if (displayName !== chat.name) {
      text.title = chat.name;
      item.title = chat.name;
    }
    item.appendChild(text);

    if (chat.hasUnread) {
      const unreadDot = document.createElement("span");
      unreadDot.className = "wa-bookmark-bar__unread-dot";
      unreadDot.setAttribute("aria-hidden", "true");
      item.appendChild(unreadDot);
    }

    item.addEventListener("click", function (event) {
      event.stopPropagation();
      onBookmarkClick(presentationChat);
    });

    return item;
  }

  function getDisplayNameForChat(chatName, settings) {
    const normalized = settingsApi.mergeSettings(settings || cachedUiSettings);
    const aliases = normalized.contactAliases || {};
    return aliases[chatName] || chatName;
  }

  function isContactInGroup(chatName, groups) {
    return Array.isArray(groups) && groups.some(function (group) {
      return groupContainsChat(group, chatName);
    });
  }

  function groupContainsChat(group, chatName) {
    if (!group || typeof group !== "object" || !Array.isArray(group.contacts)) {
      return false;
    }

    return group.contacts.some(function (contactName) {
      return contactName === chatName;
    });
  }

  function onBookmarkClick(chat) {
    if (activeChatId === chat.id && activePanel) {
      closePanel();
      return;
    }

    if (isWhatsApp && chat.element) {
      switchToChat(chat);
    } else if (!isWhatsApp) {
      requestSwitchChat(chat);
    }

    // Give WhatsApp more time to load the conversation when the contact
    // has no custom avatar and may switch slower.
    window.setTimeout(function () {
      openPanel(chat);
    }, 50);
  }

  function switchToChat(chat) {
    if (!chat.element) {
      console.log("[BookmarkBar] switchToChat skipped: no element for", chat && chat.name);
      return;
    }

    console.log("[BookmarkBar] switching to chat:", chat.name, "element:", chat.element);

    chat.element.scrollIntoView({ behavior: "instant", block: "nearest" });

    // Simulate a realistic user click sequence. Some WhatsApp rows
    // (especially default-avatar contacts) only react when the click
    // lands on a focusable inner target with proper coordinates.
    triggerRealisticClick(chat.element);

    const titleEl = chat.element.querySelector('[data-testid="cell-frame-title"]');
    if (titleEl) {
      triggerRealisticClick(titleEl);
    }

    // Last resort: focus the row and dispatch Enter, which WhatsApp also accepts.
    if (typeof chat.element.focus === "function") {
      try {
        chat.element.focus();
      } catch (e) {}
    }
    chat.element.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    }));
  }

  function triggerRealisticClick(target) {
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      screenX: centerX,
      screenY: centerY
    };

    target.dispatchEvent(new MouseEvent("mouseenter", eventInit));
    target.dispatchEvent(new MouseEvent("mousedown", eventInit));
    target.dispatchEvent(new MouseEvent("mouseup", eventInit));
    target.dispatchEvent(new MouseEvent("click", eventInit));

    // Some React bindings listen to pointer events instead of mouse events.
    if (typeof PointerEvent !== "undefined") {
      target.dispatchEvent(new PointerEvent("pointerdown", eventInit));
      target.dispatchEvent(new PointerEvent("pointerup", eventInit));
    }
  }

  async function openPanel(chat) {
    closePanel();
    activeChatId = chat.id;
    panelSendFeedback = "";

    activePanel = document.createElement("div");
    activePanel.className = PANEL_CLASS + " " + PANEL_CLASS + "--active";
    applyThemeVariables(activePanel, cachedUiSettings);

    const bookmarkItem = barElement.querySelector(
      '[data-chat-id="' + CSS.escape(chat.id) + '"]'
    );
    if (bookmarkItem) {
      const rect = bookmarkItem.getBoundingClientRect();
      activePanel.style.left = Math.min(rect.left, window.innerWidth - 360) + "px";
    } else {
      activePanel.style.left = "8px";
    }

    const header = document.createElement("div");
    header.className = "wa-bookmark-bar__panel-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "wa-bookmark-bar__panel-title-group";

    const title = document.createElement("span");
    title.textContent = chat.displayName || chat.name;
    if (chat.displayName && chat.displayName !== chat.name) {
      title.title = chat.name;
    }
    titleGroup.appendChild(title);

    const status = document.createElement("div");
    status.className = "wa-bookmark-bar__panel-status";
    status.textContent = getPanelStatusText();
    if (status.textContent) {
      titleGroup.appendChild(status);
    }

    header.appendChild(titleGroup);

    const closeBtn = document.createElement("button");
    closeBtn.className = "wa-bookmark-bar__close-btn";
    closeBtn.innerHTML = "&#10005;";
    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      closePanel();
    });
    header.appendChild(closeBtn);

    activePanel.appendChild(header);

    const messagesArea = document.createElement("div");
    messagesArea.className = "wa-bookmark-bar__panel-messages";
    messagesArea.id = "wa-bookmark-panel-messages";
    activePanel.appendChild(messagesArea);

    const inputArea = document.createElement("div");
    inputArea.className = "wa-bookmark-bar__panel-input-area";

    const input = document.createElement("input");
    input.className = "wa-bookmark-bar__panel-input";
    input.type = "text";
    input.placeholder = "Type a message...";

    let isComposing = false;
    let compositionEndTimer = null;

    input.addEventListener("compositionstart", function () {
      isComposing = true;
      if (compositionEndTimer) {
        window.clearTimeout(compositionEndTimer);
        compositionEndTimer = null;
      }
    });

    input.addEventListener("compositionend", function () {
      isComposing = false;
      // Keep the guard up for a short moment so that the Enter keydown
      // that often follows compositionend is still ignored.
      compositionEndTimer = window.setTimeout(function () {
        compositionEndTimer = null;
      }, 150);
    });

    input.addEventListener("keydown", function (event) {
      if (input.disabled) return;
      if (event.key === "Enter" && input.value.trim()) {
        if (event.isComposing || isComposing || compositionEndTimer) {
          return;
        }
        void submitPanelMessage(chat, input);
      }
    });

    const emojiBtn = createEmojiPickerButton(input, inputArea);

    const sendBtn = document.createElement("button");
    sendBtn.className = "wa-bookmark-bar__panel-send";
    sendBtn.innerHTML = "&#10148;";
    sendBtn.addEventListener("click", function () {
      if (input.disabled) return;
      if (input.value.trim()) {
        void submitPanelMessage(chat, input);
      }
    });

    inputArea.appendChild(input);
    inputArea.appendChild(emojiBtn);
    inputArea.appendChild(sendBtn);
    activePanel.appendChild(inputArea);

    document.body.appendChild(activePanel);

    const panelForChat = activePanel;
    const selectedChatId = chat.id;
    const sendAvailable = isWhatsApp ? true : await checkSendAvailability();
    currentSendAvailability = sendAvailable;
    updatePanelStatus();

    if (
      !activePanel ||
      activePanel !== panelForChat ||
      activeChatId !== selectedChatId ||
      !panelForChat.isConnected
    ) {
      return;
    }

    if (!sendAvailable) {
      setPanelComposerState(false);
    }

    window.setTimeout(function () {
      if (
        activePanel &&
        activePanel === panelForChat &&
        activeChatId === selectedChatId
      ) {
        refreshPanelMessages(chat);
      }
    }, isWhatsApp ? 1000 : 100);
  }

  function closePanel() {
    if (activePanel) {
      activePanel.remove();
      activePanel = null;
    }
    activeChatId = null;
    panelSendFeedback = "";
  }

  function refreshPanelMessages(chat, isRetry) {
    if (!activePanel) return;

    const messagesArea = activePanel.querySelector("#wa-bookmark-panel-messages");
    if (!messagesArea) return;
    const shouldStickToBottom = isMessagesAreaNearBottom(messagesArea);
    const previousScrollTop = typeof messagesArea.scrollTop === "number" ? messagesArea.scrollTop : 0;

    messagesArea.innerHTML = "";

    const canReadLiveMessages = !isWhatsApp || isMainPanelShowingChat(chat);
    const messages = isWhatsApp
      ? canReadLiveMessages
        ? extractMessagesFromMainPanel()
        : []
      : getCachedMessages(chat.id);

    console.log("[BookmarkBar] refreshPanelMessages:", chat && chat.name, "canRead:", canReadLiveMessages, "count:", messages.length, "isRetry:", !!isRetry);

    if (isWhatsApp && canReadLiveMessages && chat && chat.id) {
      void persistChatMessages(chat.id, messages).catch(function (error) {
        logBookmarkBarAsyncError("BookmarkBar: persist messages error", error);
      });
    }

    if (messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "wa-bookmark-bar__empty";
      empty.textContent = isWhatsApp
        ? "Loading messages..."
        : "No cached messages yet";
      messagesArea.appendChild(empty);

      // On WhatsApp, retry once after a short delay in case the chat is still switching.
      if (isWhatsApp && !isRetry) {
        window.setTimeout(function () {
          if (activePanel && activeChatId === (chat && chat.id)) {
            refreshPanelMessages(chat, true);
          }
        }, 2000);
      }
      return;
    }

    messages.forEach(function (msg) {
      const bubble = document.createElement("div");
      bubble.className =
        "wa-bookmark-bar__message wa-bookmark-bar__message--" +
        (isOutgoingMessage(msg) ? "outgoing" : "incoming");

      if (msg.sender && !isOutgoingMessage(msg)) {
        const sender = document.createElement("div");
        sender.className = "wa-bookmark-bar__message-sender";
        sender.textContent = msg.sender;
        bubble.appendChild(sender);
      }

      const body = document.createElement("div");
      body.className = "wa-bookmark-bar__message-body";

      const mediaRendered = renderMessageMedia(body, msg);
      const displayText = getRenderableMessageText(msg);
      if (displayText) {
        const textNode = document.createElement("div");
        textNode.className = "wa-bookmark-bar__message-text";
        textNode.textContent = displayText;
        body.appendChild(textNode);
      } else if (!mediaRendered && getMessageFallbackText(msg)) {
        const fallbackNode = document.createElement("div");
        fallbackNode.className = "wa-bookmark-bar__message-text";
        fallbackNode.textContent = getMessageFallbackText(msg);
        body.appendChild(fallbackNode);
      }

      bubble.appendChild(body);

      messagesArea.appendChild(bubble);
    });

    if (shouldStickToBottom) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    } else {
      messagesArea.scrollTop = Math.min(previousScrollTop, messagesArea.scrollHeight);
    }
  }

  function isMessagesAreaNearBottom(messagesArea) {
    if (!messagesArea) {
      return true;
    }

    const scrollTop = typeof messagesArea.scrollTop === "number" ? messagesArea.scrollTop : 0;
    const scrollHeight = typeof messagesArea.scrollHeight === "number" ? messagesArea.scrollHeight : 0;
    const clientHeight = typeof messagesArea.clientHeight === "number" ? messagesArea.clientHeight : 0;

    if (scrollHeight <= clientHeight) {
      return true;
    }

    return scrollTop + clientHeight >= scrollHeight - 24;
  }

  function isExtensionContextInvalidatedError(error) {
    const message =
      (error && typeof error.message === "string" && error.message) ||
      (typeof error === "string" ? error : "");
    return message.indexOf("Extension context invalidated") !== -1;
  }

  function logBookmarkBarAsyncError(context, error) {
    if (isExtensionContextInvalidatedError(error)) {
      return;
    }

    console.error(context, error);
  }

  function extractMessagesFromMainPanel() {
    try {
      const messages = [];
      const msgContainers = document.querySelectorAll(
        '#main [data-testid="msg-container"]'
      );

      const recent = Array.from(msgContainers).slice(
        -bookmarkDataApi.MAX_CACHED_MESSAGES
      );

      recent.forEach(function (container) {
        const isOutgoing = isOutgoingContainer(container);
        const content = extractMessageContent(container);
        const text = content.text;
        const sender = extractMessageSender(container);
        const timestampLabel = extractTimestampLabel(container);
        messages.push({
          id: buildMessageId(container, text, timestampLabel),
          text: text.trim(),
          direction: isOutgoing ? "outgoing" : "incoming",
          isOutgoing: isOutgoing,
          sender: sender,
          timestampLabel: timestampLabel,
          kind: content.kind,
          media: content.media,
          fallbackText: content.fallbackText
        });
      });

      return messages;
    } catch (error) {
      if (isExtensionContextInvalidatedError(error)) {
        return [];
      }

      throw error;
    }
  }

  async function persistChatList(chats) {
    const result = await chrome.storage.local.get(DATA_KEY);
    const previousData = bookmarkDataApi.normalizeBookmarkData(
      result[DATA_KEY] || cachedBookmarkData
    );
    const data = bookmarkDataApi.normalizeBookmarkData(previousData);
    const nextChats = Array.isArray(chats) ? chats.slice() : [];
    const eventEntries = getUnreadPreviewEventEntries(previousData, nextChats);

    data.chats = nextChats;
    data.sourceTabAvailable = true;

    if (!hasBookmarkDataMeaningfulChange(previousData, data)) {
      cachedBookmarkData = previousData;
      return;
    }

    data.updatedAt = Date.now();
    cachedBookmarkData = data;
    await writeBookmarkData(data, eventEntries);
  }

  async function persistChatMessages(chatId, messages) {
    const result = await chrome.storage.local.get(DATA_KEY);
    const previousData = bookmarkDataApi.normalizeBookmarkData(
      result[DATA_KEY] || cachedBookmarkData
    );
    let data = bookmarkDataApi.normalizeBookmarkData(previousData);

    if (Array.isArray(messages) && messages.length > 0) {
      data.messagesByChatId[chatId] = [];
      messages.forEach(function (message) {
        data = bookmarkDataApi.appendCachedMessage(data, chatId, message);
      });
    }

    data.sourceTabAvailable = true;

    if (!hasBookmarkDataMeaningfulChange(previousData, data)) {
      cachedBookmarkData = previousData;
      return;
    }

    const eventEntries = getNewIncomingMessageEventEntries(previousData, data);
    data.updatedAt = Date.now();
    cachedBookmarkData = data;
    await writeBookmarkData(data, eventEntries);
  }

  async function writeBookmarkData(data, eventEntries) {
    const payload = {
      [DATA_KEY]: data
    };
    const batch = createIncomingEventBatch(eventEntries, data.updatedAt);

    if (batch && batch.entries.length > 0) {
      payload[INCOMING_EVENTS_KEY] = batch;
    }

    await chrome.storage.local.set(payload);
  }

  function hasBookmarkDataMeaningfulChange(previousData, nextData) {
    return !areJsonEqual(
      getComparableBookmarkData(previousData),
      getComparableBookmarkData(nextData)
    );
  }

  function getComparableBookmarkData(data) {
    const normalized = bookmarkDataApi.normalizeBookmarkData(data);
    return {
      chats: normalized.chats,
      messagesByChatId: normalized.messagesByChatId,
      sourceTabAvailable: normalized.sourceTabAvailable
    };
  }

  function areJsonEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function getUnreadPreviewEventEntries(previousData, nextChats) {
    const previousById = {};
    const previousByName = {};
    const previousChats = Array.isArray(previousData.chats) ? previousData.chats : [];
    const entries = [];

    previousChats.forEach(function (chat) {
      if (!chat) {
        return;
      }
      if (chat.id) {
        previousById[chat.id] = chat;
      }
      if (chat.name && !previousByName[chat.name]) {
        previousByName[chat.name] = chat;
      }
    });

    nextChats.forEach(function (chat) {
      if (!chat || !chat.hasUnread || !chat.preview) {
        return;
      }

      const previous = previousById[chat.id] || previousByName[chat.name];
      if (!previous) {
        return;
      }

      if (previous.hasUnread === true && previous.preview === chat.preview) {
        return;
      }

      entries.push({
        eventId: buildIncomingEventId("preview", chat.id, {
          id: "preview:" + chat.id + ":" + chat.preview,
          text: chat.preview,
          direction: "incoming",
          kind: "preview"
        }),
        chatId: chat.id,
        contactName: chat.name || chat.id,
        text: chat.preview,
        source: "preview",
        message: {
          id: "preview:" + chat.id + ":" + chat.preview,
          text: chat.preview,
          direction: "incoming",
          kind: "preview"
        }
      });
    });

    return entries;
  }

  function getNewIncomingMessageEventEntries(previousData, nextData) {
    return getNewIncomingMessagesFromData(previousData, nextData).map(function (entry) {
      const message = entry.message || {};
      return {
        eventId: buildIncomingEventId("message", entry.chatId, message),
        chatId: entry.chatId,
        contactName: entry.contactName,
        text: getIncomingEventText({ message: message }),
        source: "message",
        message: message
      };
    });
  }

  function getNewIncomingMessagesFromData(previousRaw, nextRaw) {
    const dashboardApi = globalThis.WhatsAppBlurDashboardData;
    if (dashboardApi && typeof dashboardApi.getNewIncomingMessages === "function") {
      return dashboardApi.getNewIncomingMessages(previousRaw, nextRaw);
    }

    const previousMessages =
      previousRaw.messagesByChatId && typeof previousRaw.messagesByChatId === "object"
        ? previousRaw.messagesByChatId
        : {};
    const nextMessages =
      nextRaw.messagesByChatId && typeof nextRaw.messagesByChatId === "object"
        ? nextRaw.messagesByChatId
        : {};
    const chatNames = (Array.isArray(nextRaw.chats) ? nextRaw.chats : []).reduce(
      function (accumulator, chat) {
        if (chat && chat.id) {
          accumulator[chat.id] = chat.name || chat.id;
        }
        return accumulator;
      },
      {}
    );
    const previousChatIdsByName = (Array.isArray(previousRaw.chats) ? previousRaw.chats : []).reduce(
      function (accumulator, chat) {
        if (chat && chat.id && chat.name && !accumulator[chat.name]) {
          accumulator[chat.name] = chat.id;
        }
        return accumulator;
      },
      {}
    );
    const additions = [];

    Object.keys(nextMessages).forEach(function (chatId) {
      const previousChatId = Object.prototype.hasOwnProperty.call(previousMessages, chatId)
        ? chatId
        : previousChatIdsByName[chatNames[chatId]];
      if (
        !previousChatId ||
        !Object.prototype.hasOwnProperty.call(previousMessages, previousChatId)
      ) {
        return;
      }

      const known = new Set(
        (Array.isArray(previousMessages[previousChatId]) ? previousMessages[previousChatId] : []).map(
          getEventMessageFingerprint
        )
      );

      (Array.isArray(nextMessages[chatId]) ? nextMessages[chatId] : []).forEach(
        function (message) {
          if (
            !message ||
            message.isOutgoing === true ||
            message.direction === "outgoing" ||
            known.has(getEventMessageFingerprint(message))
          ) {
            return;
          }

          additions.push({
            chatId: chatId,
            contactName: chatNames[chatId] || chatId,
            message: message
          });
        }
      );
    });

    return additions;
  }

  function buildIncomingEventId(source, chatId, message) {
    return [
      source || "message",
      chatId || "",
      getEventMessageFingerprint(message)
    ].join("|");
  }

  function getEventMessageFingerprint(message) {
    if (message && message.id) {
      return "id:" + message.id;
    }

    return [
      message && message.timestampLabel,
      message && message.direction,
      message && message.sender,
      message && message.text,
      message && message.mediaSrc
    ].join("|");
  }

  function createIncomingEventBatch(entries, createdAt) {
    if (
      bookmarkDataApi &&
      typeof bookmarkDataApi.createIncomingMessageEventBatch === "function"
    ) {
      return bookmarkDataApi.createIncomingMessageEventBatch(entries, createdAt);
    }

    const normalized = Array.isArray(entries) ? entries.filter(Boolean) : [];
    return {
      id: String(createdAt || Date.now()),
      createdAt: createdAt || Date.now(),
      entries: normalized
    };
  }

  function getIncomingEventText(entry) {
    if (bookmarkDataApi && typeof bookmarkDataApi.getIncomingEventText === "function") {
      return bookmarkDataApi.getIncomingEventText(entry);
    }

    const message = (entry && entry.message) || {};
    return (message.text || message.fallbackText || "").trim();
  }

  // ─── Send message ───

  async function sendMessage(chat, text) {
    if (isWhatsApp) {
      return sendMessageLocal(chat, text);
    } else {
      return sendMessageRemote(chat, text);
    }
  }

  async function submitPanelMessage(chat, input) {
    if (!input || input.disabled) {
      return;
    }

    const text = input.value.trim();
    if (!text) {
      return;
    }

    input.value = "";
    try {
      input.focus();
    } catch (e) {}

    pendingSendCount += 1;
    setPanelSendFeedback(getSendingFeedbackText());

    enqueueSendMessage(chat, text)
      .then(function (sent) {
        pendingSendCount = Math.max(0, pendingSendCount - 1);
        if (sent) {
          currentSendAvailability = true;
          if (pendingSendCount > 0) {
            setPanelSendFeedback(getSendingFeedbackText());
          } else {
            setPanelSendFeedback("Sent just now");
          }
          return;
        }

        setPanelSendFeedback(
          pendingSendCount > 0 ? getSendingFeedbackText() : "Send failed"
        );
      })
      .catch(function () {
        pendingSendCount = Math.max(0, pendingSendCount - 1);
        setPanelSendFeedback(
          pendingSendCount > 0 ? getSendingFeedbackText() : "Send failed"
        );
      });
  }

  function enqueueSendMessage(chat, text) {
    const task = sendQueue
      .catch(function () {
        return false;
      })
      .then(function () {
        return sendMessage(chat, text);
      });

    sendQueue = task.catch(function () {
      return false;
    });

    return task;
  }

  function getSendingFeedbackText() {
    return pendingSendCount > 1
      ? "Sending " + pendingSendCount + " messages..."
      : "Sending...";
  }

  async function sendMessageLocal(chat, text) {
    try {
      const currentSelected = document.querySelector(
        '#pane-side .focusable-list-item[tabindex="0"], #pane-side [aria-selected="true"]'
      );

      const alreadyShowingTarget = isMainPanelShowingChat(chat);

      if (!alreadyShowingTarget && chat.element) {
        chat.element.scrollIntoView({ behavior: "instant", block: "nearest" });
        chat.element.click();
        chat.element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      } else if (!alreadyShowingTarget) {
        // Fallback: try to find element by name
        const fallback = findChatElementById(chat.id);
        if (fallback) {
          fallback.scrollIntoView({ behavior: "instant", block: "nearest" });
          fallback.click();
          fallback.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        }
      }

      const inputBox = await waitForComposeInputBox(alreadyShowingTarget ? 250 : 1200);

      if (!inputBox) {
        console.error("BookmarkBar: input box not found");
        restoreChat(currentSelected);
        return false;
      }

      inputBox.focus();
      inputBox.innerHTML = "";

      if (document.execCommand) {
        document.execCommand("insertText", false, text);
      } else {
        const textNode = document.createTextNode(text);
        inputBox.appendChild(textNode);
      }

      inputBox.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
      await wait(150);

      const sendBtn = document.querySelector(
        'footer button[data-testid="send"], footer button[aria-label="Send"], footer span[data-icon="send"]'
      );
      if (sendBtn) {
        sendBtn.click();
      } else {
        const ke = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        inputBox.dispatchEvent(ke);
      }

      if (!alreadyShowingTarget && currentSelected) {
        window.setTimeout(function () {
          restoreChat(currentSelected);
        }, 150);
      }

      if (activePanel && activeChatId === chat.id) {
        window.setTimeout(function () {
          refreshPanelMessages(chat);
        }, 300);
      }

      return true;
    } catch (error) {
      console.error("BookmarkBar: send error", error);
      return false;
    }
  }

  async function sendMessageRemote(chat, text) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "BOOKMARK_BAR_SEND",
        chatId: chat.id,
        chatName: chat.name,
        text: text
      });

      if (!response || response.ok !== true) {
        return false;
      }

      await appendOutgoingMessageToCache(chat.id, text);

      if (activePanel && activeChatId === chat.id) {
        updatePanelStatus();
        refreshPanelMessages(chat);
      }

      return true;
    } catch (error) {
      console.error("BookmarkBar: remote send error", error);
      return false;
    }
  }

  async function appendOutgoingMessageToCache(chatId, text) {
    const result = await chrome.storage.local.get(DATA_KEY);
    let data = bookmarkDataApi.normalizeBookmarkData(
      result[DATA_KEY] || cachedBookmarkData
    );

    data = bookmarkDataApi.appendCachedMessage(data, chatId, {
      id: [Date.now(), text].join(":"),
      text: text,
      direction: "outgoing",
      isOutgoing: true,
      sender: "",
      timestampLabel: "",
      kind: "text",
      fallbackText: ""
    });
    data.updatedAt = Date.now();
    data.sourceTabAvailable = true;
    cachedBookmarkData = data;

    await chrome.storage.local.set({
      [DATA_KEY]: data
    });
  }

  function findChatById(chatId) {
    const chats = extractChatsFromWhatsApp();
    const byId = chats.find(function (entry) {
      return entry.id === chatId;
    });
    if (byId) return byId;
    return null;
  }

  function findChatByName(name) {
    if (!name) return null;
    const chats = extractChatsFromWhatsApp();
    return chats.find(function (entry) {
      return entry.name === name;
    }) || null;
  }

  function findChatElementById(chatId) {
    const chat = findChatById(chatId);
    return chat ? chat.element : null;
  }

  async function requestSwitchChat(chat) {
    try {
      await chrome.runtime.sendMessage({
        type: "BOOKMARK_BAR_SWITCH_CHAT",
        chatId: chat.id,
        chatName: chat.name
      });
    } catch (e) {}
  }

  function restoreChat(chatElement) {
    if (chatElement && chatElement.isConnected) {
      chatElement.scrollIntoView({ behavior: "instant", block: "nearest" });
      chatElement.click();
      chatElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    }
  }

  function findComposeInputBox() {
    return document.querySelector(
      'footer [contenteditable="true"], footer [data-testid="conversation-compose-box-input"], [data-testid="compose-box-input"]'
    );
  }

  async function waitForComposeInputBox(timeoutMs) {
    const timeout = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : 600;
    const startedAt = Date.now();
    let inputBox = findComposeInputBox();

    while (!inputBox && Date.now() - startedAt < timeout) {
      await wait(50);
      inputBox = findComposeInputBox();
    }

    return inputBox;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function onDocumentClick(event) {
    if (
      activePanel &&
      !activePanel.contains(event.target) &&
      barElement &&
      !barElement.contains(event.target)
    ) {
      closePanel();
      return;
    }

    if (activePanel) {
      const picker = activePanel.querySelector(".wa-bookmark-bar__emoji-picker");
      const emojiBtn = activePanel.querySelector(".wa-bookmark-bar__panel-emoji-btn");
      if (
        picker &&
        picker.style.display !== "none" &&
        emojiBtn &&
        event.target !== emojiBtn &&
        !emojiBtn.contains(event.target) &&
        !picker.contains(event.target)
      ) {
        picker.style.display = "none";
      }
    }
  }

  function onDocumentKeydown(event) {
    if (event.key === "Escape" && activePanel) {
      const picker = activePanel.querySelector(".wa-bookmark-bar__emoji-picker");
      if (picker && picker.style.display !== "none") {
        picker.style.display = "none";
      }
    }
  }

  function normalizeBookmarkData(data) {
    return bookmarkDataApi.normalizeBookmarkData(data);
  }

  function resolveChatId(item, titleEl, name, index) {
    const candidates = [
      getAttributeValue(item, "data-id"),
      getAttributeValue(item, "data-chat-id"),
      getAttributeValue(item, "id"),
      getAttributeValue(item, "aria-label"),
      getAttributeValue(titleEl, "title"),
      getAttributeValue(titleEl, "aria-label"),
      getAttributeValue(item, "data-testid")
    ];

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (isUsableChatId(candidate)) {
        return candidate;
      }
    }

    // Fallback: use the chat name. In practice contact names are unique
    // enough in a typical WhatsApp list, and this is far more stable than
    // name + index which breaks whenever the list is reordered.
    return name;
  }

  function getAttributeValue(node, attributeName) {
    if (!node || typeof node.getAttribute !== "function") {
      return "";
    }

    const value = node.getAttribute(attributeName);
    return typeof value === "string" ? value.trim() : "";
  }

  function isUsableChatId(value) {
    if (!value) {
      return false;
    }

    return !/^cell-frame-(container|title|secondary)$/.test(value) && !hasUnreadLabel(value);
  }

  function getCachedMessages(chatId) {
    const messagesByChatId = cachedBookmarkData.messagesByChatId || {};
    const messages = messagesByChatId[chatId];
    return Array.isArray(messages) ? messages : [];
  }

  function isOutgoingMessage(message) {
    return message && (message.isOutgoing === true || message.direction === "outgoing");
  }

  function isMainPanelShowingChat(chat) {
    if (!chat || !chat.name) {
      return false;
    }

    // Primary check: the chat row in the left pane is the selected one.
    // This is the most reliable signal because WhatsApp marks the active
    // conversation explicitly with aria-selected/tabindex on the listitem.
    if (isChatRowSelected(chat)) {
      console.log("[BookmarkBar] chat row selected:", chat.name);
      return true;
    }

    // Fallback: header title match.
    const headerTitle = resolveHeaderTitle();
    const headerName = headerTitle && headerTitle.textContent
      ? headerTitle.textContent.trim()
      : "";

    console.log("[BookmarkBar] isMainPanelShowingChat:", chat.name, "headerName:", headerName);

    if (!headerName) {
      return false;
    }

    if (headerName !== chat.name && !headerName.includes(chat.name)) {
      console.log("[BookmarkBar] header mismatch:", headerName, "!==", chat.name);
      return false;
    }

    const selectedSignals = collectChatIdentitySignals(chat);
    const headerSignals = collectHeaderIdentitySignals(headerTitle);

    if (selectedSignals.length > 0 && headerSignals.length > 0) {
      const matched = headerSignals.some(function (signal) {
        return selectedSignals.indexOf(signal) !== -1;
      });
      console.log("[BookmarkBar] signals matched:", matched, "selected:", selectedSignals, "header:", headerSignals);
      return matched;
    }

    if (isChatNameAmbiguous(chat)) {
      console.log("[BookmarkBar] chat name ambiguous:", chat.name);
      return false;
    }

    console.log("[BookmarkBar] main panel shows chat (name match):", chat.name);
    return true;
  }

  function isChatRowSelected(chat) {
    if (!chat.element) {
      return false;
    }

    // Walk up from the chat element to find the listitem and check selection.
    let current = chat.element;
    let depth = 0;
    const maxDepth = 4;

    while (current && depth < maxDepth) {
      const role = current.getAttribute && current.getAttribute("role");
      const ariaSelected = current.getAttribute && current.getAttribute("aria-selected");
      const tabIndex = current.getAttribute && current.getAttribute("tabindex");

      if (ariaSelected === "true") {
        return true;
      }
      if (role === "listitem" && tabIndex === "0") {
        return true;
      }
      if (role === "listitem" && tabIndex === "-1" && current.className && String(current.className).includes("focusable-list-item")) {
        return true;
      }

      current = current.parentElement;
      depth += 1;
    }

    // Alternative: find the globally selected row in the left pane and check
    // whether it contains our chat element.
    try {
      const selectedRow = document.querySelector(
        '#pane-side [aria-selected="true"], #pane-side [role="listitem"][tabindex="0"]'
      );
      if (selectedRow && (selectedRow === chat.element || selectedRow.contains(chat.element))) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  function resolveHeaderTitle() {
    // Strategy 1: look for WhatsApp's selectable-text title node in the header.
    const selectableTitles = document.querySelectorAll('#main header [data-testid="selectable-text"]');
    for (let i = 0; i < selectableTitles.length; i += 1) {
      const text = (selectableTitles[i].textContent || "").trim();
      if (text && !isKnownNonTitleText(text)) {
        return selectableTitles[i];
      }
    }

    // Strategy 2: use the document-level [title] selector that tests also mock.
    const testTitle = document.querySelector('#main header [title]');
    if (testTitle) {
      const text = (testTitle.textContent || "").trim();
      if (text && !isKnownNonTitleText(text)) {
        return testTitle;
      }
    }

    // Strategy 3: if the first [title] was a non-title, try the rest.
    const allTitles = document.querySelectorAll('#main header [title]');
    for (let i = 0; i < allTitles.length; i += 1) {
      const text = (allTitles[i].textContent || "").trim();
      if (text && !isKnownNonTitleText(text)) {
        return allTitles[i];
      }
    }

    // Strategy 4: scan the header for the largest plausible chat name.
    const header = document.querySelector('#main header');
    if (header) {
      const textNodes = [];
      const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim();
        if (text && text.length > 1 && !isKnownNonTitleText(text)) {
          textNodes.push({ text: text, parent: node.parentElement });
        }
      }
      textNodes.sort(function (a, b) {
        return b.text.length - a.text.length;
      });
      if (textNodes.length > 0) {
        return textNodes[0].parent;
      }
    }

    return null;
  }

  function isKnownNonTitleText(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return (
      /^default-(contact|group)-refreshed$/.test(text) ||
      lower === "ic-arrow-drop-down" ||
      lower === "点击此处查看联系人信息" ||
      lower === "给自己发消息" ||
      lower === "note to self" ||
      lower.indexOf("click here") !== -1 ||
      lower.indexOf("arrow") !== -1
    );
  }

  function collectChatIdentitySignals(chat) {
    const signals = [];
    pushUniqueSignal(signals, chat && chat.id);
    pushUniqueSignal(signals, getAttributeValue(chat && chat.element, "data-chat-id"));
    pushUniqueSignal(signals, getAttributeValue(chat && chat.element, "data-id"));
    pushUniqueSignal(signals, getAttributeValue(chat && chat.element, "aria-label"));
    pushUniqueSignal(signals, getAttributeValue(chat && chat.element, "id"));
    return signals;
  }

  function collectHeaderIdentitySignals(headerTitle) {
    const signals = [];
    pushUniqueSignal(signals, getAttributeValue(headerTitle, "data-chat-id"));
    pushUniqueSignal(signals, getAttributeValue(headerTitle, "data-id"));
    pushUniqueSignal(signals, getAttributeValue(headerTitle, "aria-label"));
    pushUniqueSignal(signals, getAttributeValue(headerTitle, "id"));
    return signals;
  }

  function pushUniqueSignal(list, value) {
    if (!isUsableChatId(value)) {
      return;
    }

    if (list.indexOf(value) === -1) {
      list.push(value);
    }
  }

  function isChatNameAmbiguous(chat) {
    if (!isWhatsApp || !chat || !chat.name) {
      return false;
    }

    const chats = extractChatsFromWhatsApp();
    let matches = 0;
    for (let i = 0; i < chats.length; i += 1) {
      if (chats[i].name === chat.name) {
        matches += 1;
        if (matches > 1) {
          return true;
        }
      }
    }

    return false;
  }

  function isOutgoingContainer(container) {
    if (!container) return false;

    const idDirection = inferMessageDirectionFromIds(container);
    if (idDirection) {
      return idDirection === "outgoing";
    }

    const directionNode = findPrimaryDirectionNode(container);
    if (directionNode) {
      return isOutgoingDirectionNode(directionNode);
    }

    // WhatsApp read-receipt/status icons are reliable outgoing markers.
    const statusSelectors = [
      '[data-testid="msg-check"]',
      '[data-testid="msg-dblcheck"]',
      '[data-testid="msg-dblcheck-ack"]',
      '[data-testid="status-check"]',
      '[data-testid="status-dblcheck"]',
      '[data-testid="status-dblcheck-ack"]',
      '[data-testid="status-ptt"]',
      '[data-testid="status-img"]',
      '[data-icon="check"]',
      '[data-icon="dblcheck"]',
      '[data-icon="ack"]'
    ];
    for (let i = 0; i < statusSelectors.length; i += 1) {
      if (queryPrimarySelector(container, statusSelectors[i]) !== null) {
        return true;
      }
    }

    // Class / data-testid markers.
    if (
      container.classList.contains("message-out") ||
      container.getAttribute("data-testid") === "outgoing" ||
      container.closest('.message-out, [data-testid*="outgoing"]') !== null
    ) {
      return true;
    }

    // Layout heuristics: outgoing messages are aligned to the right.
    const primaryBubble = findPrimaryMessageBubble(container) || container;
    const style = (typeof primaryBubble.getAttribute === "function" && primaryBubble.getAttribute("style")) || "";
    if (/justify-content:\s*flex-end/i.test(style) || /margin-left:\s*auto/i.test(style)) {
      return true;
    }

    if (isOutgoingByGeometry(container)) {
      return true;
    }

    const parent = primaryBubble.parentElement;
    if (parent) {
      const parentStyle = (typeof parent.getAttribute === "function" && parent.getAttribute("style")) || "";
      if (/justify-content:\s*flex-end/i.test(parentStyle)) {
        return true;
      }
    }

    // Bubble colour heuristic: outgoing bubble green in the default WhatsApp light theme.
    const bubble = primaryBubble.querySelector('[class*="message-"]') || primaryBubble.firstElementChild || primaryBubble;
    if (bubble && typeof window.getComputedStyle === "function") {
      try {
        const computed = window.getComputedStyle(bubble);
        const bg = (computed.backgroundColor || "").replace(/\s/g, "");
        // Common outgoing greens: #d9fdd3, #e7ffdb, rgb(220,248,198), rgb(211,245,211)
        if (
          /^(rgba?\(220,248,198|rgba?\(211,245,211|rgba?\(231,255,219)/i.test(bg) ||
          /^#d9fdd3/i.test(bg) ||
          /^#e7ffdb/i.test(bg)
        ) {
          return true;
        }
      } catch (e) {
        // ignore
      }
    }

    return false;
  }

  function inferMessageDirectionFromIds(container) {
    const candidates = collectMessageIdentityNodes(container);
    for (let i = 0; i < candidates.length; i += 1) {
      const direction = inferDirectionFromIdentityNode(candidates[i]);
      if (direction) {
        return direction;
      }
    }

    return "";
  }

  function collectMessageIdentityNodes(container) {
    const nodes = [];
    pushUniqueNode(nodes, container);

    let current = container ? container.parentElement : null;
    let depth = 0;
    while (current && depth < 4) {
      pushUniqueNode(nodes, current);
      current = current.parentElement;
      depth += 1;
    }

    const idNode = queryPrimarySelector(container, "[data-id]");
    pushUniqueNode(nodes, idNode);

    return nodes;
  }

  function pushUniqueNode(nodes, node) {
    if (node && nodes.indexOf(node) === -1) {
      nodes.push(node);
    }
  }

  function inferDirectionFromIdentityNode(node) {
    const values = [
      getAttributeValue(node, "data-id"),
      getAttributeValue(node, "data-message-id"),
      getAttributeValue(node, "id")
    ];

    for (let i = 0; i < values.length; i += 1) {
      const direction = inferDirectionFromMessageId(values[i]);
      if (direction) {
        return direction;
      }
    }

    return "";
  }

  function inferDirectionFromMessageId(value) {
    if (typeof value !== "string") {
      return "";
    }

    const normalized = value.trim();
    if (/^true[_:-]/i.test(normalized) || /[_:-]true[_:-]/i.test(normalized)) {
      return "outgoing";
    }
    if (/^false[_:-]/i.test(normalized) || /[_:-]false[_:-]/i.test(normalized)) {
      return "incoming";
    }

    return "";
  }

  function isOutgoingByGeometry(container) {
    if (!container || typeof container.querySelectorAll !== "function") {
      return false;
    }

    const reference = getMessageGeometryReference();
    if (!reference || !reference.width) {
      return false;
    }

    const candidates = collectPrimaryGeometryCandidates(container);
    for (let i = 0; i < candidates.length; i += 1) {
      const rect = getUsableElementRect(candidates[i]);
      if (!rect) {
        continue;
      }

      const centerX = rect.left + rect.width / 2;
      const rightSideThreshold = reference.left + reference.width * 0.62;
      const leftGuard = reference.left + reference.width * 0.35;
      if (centerX >= rightSideThreshold && rect.left >= leftGuard) {
        return true;
      }
    }

    return false;
  }

  function getMessageGeometryReference() {
    let mainRect = null;
    try {
      const main = document.querySelector("#main");
      mainRect = main && typeof main.getBoundingClientRect === "function"
        ? main.getBoundingClientRect()
        : null;
    } catch (e) {
      mainRect = null;
    }

    const mainWidth = mainRect && typeof mainRect.width === "number" ? mainRect.width : 0;
    if (mainWidth > 0) {
      return {
        left: typeof mainRect.left === "number" ? mainRect.left : 0,
        width: mainWidth
      };
    }

    const viewportWidth =
      typeof window !== "undefined" && typeof window.innerWidth === "number"
        ? window.innerWidth
        : 0;
    return viewportWidth > 0 ? { left: 0, width: viewportWidth } : null;
  }

  function collectPrimaryGeometryCandidates(container) {
    const candidates = [];
    pushUniqueNode(candidates, findPrimaryMessageBubble(container));
    pushUniqueNode(candidates, container);

    const descendants = getPrimaryMessageElements(container, "div, article, span, img");
    for (let i = 0; i < descendants.length; i += 1) {
      pushUniqueNode(candidates, descendants[i]);
    }

    return candidates;
  }

  function getUsableElementRect(node) {
    if (!node || typeof node.getBoundingClientRect !== "function") {
      return null;
    }

    const rect = node.getBoundingClientRect();
    if (!rect || typeof rect.left !== "number") {
      return null;
    }

    const width =
      typeof rect.width === "number" && rect.width > 0
        ? rect.width
        : typeof rect.right === "number"
          ? rect.right - rect.left
          : 0;
    const height = typeof rect.height === "number" ? rect.height : 0;
    if (width < 24 || height < 1) {
      return null;
    }

    return {
      left: rect.left,
      width: width
    };
  }

  function findPrimaryDirectionNode(container) {
    const selectors = [
      ".message-out",
      ".message-in",
      '[class*="message-out"]',
      '[class*="message-in"]',
      '[data-testid="outgoing"]',
      '[data-testid="incoming"]',
      '[data-testid*="outgoing"]',
      '[data-testid*="incoming"]'
    ];

    for (let i = 0; i < selectors.length; i += 1) {
      const node = queryPrimarySelector(container, selectors[i]);
      if (node) {
        return node;
      }
    }

    return null;
  }

  function isOutgoingDirectionNode(node) {
    if (!node) {
      return false;
    }

    const className = getAttributeValue(node, "class");
    const testId = getAttributeValue(node, "data-testid");
    return (
      /\bmessage-out\b/i.test(className) ||
      /\boutgoing\b/i.test(testId)
    );
  }

  function findPrimaryMessageBubble(container) {
    return (
      findPrimaryDirectionNode(container) ||
      queryPrimarySelector(container, '[class*="message-"]') ||
      container
    );
  }

  function extractMessageText(container) {
    // Strategy 1: prefer .copyable-text — it usually holds the full message text
    // (including emoji) in a single element, avoiding timestamp duplication.
    let textEls = filterContainedElements(
      getPrimaryMessageElements(container, ".copyable-text")
    );
    let textParts = extractFromElements(textEls);
    if (textParts.length > 0) {
      return textParts.join(" ").trim();
    }

    // Strategy 2: fallback to .selectable-text
    textEls = filterContainedElements(
      getPrimaryMessageElements(container, ".selectable-text")
    );
    textParts = extractFromElements(textEls);
    if (textParts.length > 0) {
      return textParts.join(" ").trim();
    }

    // Strategy 3: last resort — span[dir="auto"] / span[dir="ltr"]
    textEls = filterContainedElements(
      getPrimaryMessageElements(container, 'span[dir="auto"], span[dir="ltr"]')
    );
    textParts = extractFromElements(textEls);
    if (textParts.length > 0) {
      return textParts.join(" ").trim();
    }

    return "";
  }

  function extractMessageContent(container) {
    const media = extractMessageMedia(container);
    const text = extractMessageText(container).trim();
    const fallbackText = media ? getMediaFallbackText(media.kind) : "";
    const normalizedText = normalizeMediaLabel(text);

    debugBookmarkMedia("extract", {
      kind: media ? media.kind : "text",
      text: text,
      fallbackText: fallbackText,
      mediaSrc: media && media.src ? media.src : "",
      mediaAlt: media && media.alt ? media.alt : "",
      containerLabel: getContainerMediaLabel(container)
    });

    return {
      text:
        media && fallbackText && shouldSuppressMediaCaption(normalizedText, media.kind)
          ? ""
          : text,
      kind: media ? media.kind : "text",
      media: media,
      fallbackText: fallbackText
    };
  }

  function extractMessageMedia(container) {
    if (!container || typeof container.querySelectorAll !== "function") {
      return null;
    }

    const rootDescriptor = describeLabeledMediaNode(container);
    if (rootDescriptor) {
      return rootDescriptor;
    }

    const stickerNode =
      findFirstMediaNode(container, '[data-testid*="sticker"]') ||
      findFirstMediaNode(container, '[class*="sticker"]') ||
      findFirstMediaNode(container, '[style*="background-image"]');
    if (stickerNode) {
      return buildMediaDescriptor(stickerNode, "sticker");
    }

    const videoNode = findFirstMediaNode(container, "video");
    if (videoNode) {
      return buildMediaDescriptor(videoNode, "video");
    }

    const audioNode = findFirstMediaNode(container, "audio");
    if (audioNode) {
      return buildMediaDescriptor(audioNode, "audio");
    }

    const canvasNode = findFirstMediaNode(container, "canvas");
    if (canvasNode) {
      return buildMediaDescriptor(canvasNode, "image");
    }

    const mediaLabelDescriptor = findLabeledMediaDescriptor(container);
    if (mediaLabelDescriptor) {
      return mediaLabelDescriptor;
    }

    const imageNode = findFirstMediaNode(container, "img");
    if (imageNode) {
      if (isLikelyInlineEmojiImage(imageNode, container)) {
        return null;
      }
      return buildMediaDescriptor(imageNode, "image");
    }

    return null;
  }

  function describeLabeledMediaNode(node) {
    if (!node) {
      return null;
    }

    const label = normalizeMediaLabel(
      getAttributeValue(node, "aria-label") ||
        getAttributeValue(node, "title") ||
        getAttributeValue(node, "alt") ||
        getAttributeValue(node, "data-testid") ||
        getAttributeValue(node, "class")
    );

    if (containsAnyLabel(label, ["sticker", "贴纸", "貼紙"])) {
      return buildMediaDescriptor(node, "sticker");
    }
    if (containsAnyLabel(label, ["image", "photo", "picture", "图片", "圖片"])) {
      return buildMediaDescriptor(node, "image");
    }
    if (containsAnyLabel(label, ["video"])) {
      return buildMediaDescriptor(node, "video");
    }
    if (containsAnyLabel(label, ["audio", "voice", "ptt"])) {
      return buildMediaDescriptor(node, "audio");
    }

    return null;
  }

  function findFirstMediaNode(container, selector) {
    if (!container || typeof container.querySelectorAll !== "function") {
      return null;
    }

    const nodes = container.querySelectorAll(selector);
    for (let i = 0; i < nodes.length; i += 1) {
      if (!isQuotedPreviewNode(nodes[i], container) && !isInlineEmojiNode(nodes[i])) {
        return nodes[i];
      }
    }

    return null;
  }

  function getPrimaryMessageElements(container, selector) {
    if (!container || typeof container.querySelectorAll !== "function") {
      return [];
    }

    return Array.from(container.querySelectorAll(selector)).filter(function (node) {
      return !isQuotedPreviewNode(node, container);
    });
  }

  function queryPrimarySelector(container, selector) {
    const nodes = getPrimaryMessageElements(container, selector);
    return nodes.length > 0 ? nodes[0] : null;
  }

  function isQuotedPreviewNode(node, container) {
    if (!node || node === container) {
      return false;
    }

    let current = node;
    while (current && current !== container) {
      if (hasQuotedPreviewMarker(current)) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  function hasQuotedPreviewMarker(node) {
    if (!node) {
      return false;
    }

    const label = normalizeMediaLabel(
      [
        getAttributeValue(node, "data-testid"),
        getAttributeValue(node, "aria-label"),
        getAttributeValue(node, "title"),
        getAttributeValue(node, "class")
      ].join(" ")
    );

    return containsAnyLabel(label, [
      "quoted",
      "quote",
      "quotedmessage",
      "quotedmsg",
      "replycontext",
      "replypreview",
      "引用",
      "回覆",
      "回复"
    ]);
  }

  function isInlineEmojiNode(node) {
    if (!node) {
      return false;
    }

    const tagName = typeof node.tagName === "string" ? node.tagName.toUpperCase() : "";
    if (tagName !== "IMG") {
      return false;
    }

    return isLikelyInlineEmojiImage(node);
  }

  function isLikelyInlineEmojiImage(node, container) {
    if (!node || typeof node.tagName !== "string") {
      return false;
    }

    const tagName = node.tagName.toUpperCase();
    if (tagName !== "IMG") {
      return false;
    }

    const label = normalizeMediaLabel(
      getAttributeValue(node, "aria-label") ||
        getAttributeValue(node, "title") ||
        getAttributeValue(node, "alt") ||
        getAttributeValue(node, "data-testid") ||
        getAttributeValue(node, "class")
    );
    if (containsAnyLabel(label, ["sticker", "貼紙", "贴纸"])) {
      return false;
    }

    const alt = normalizeMediaLabel(getAttributeValue(node, "alt"));
    const ariaLabel = normalizeMediaLabel(getAttributeValue(node, "aria-label"));
    const title = normalizeMediaLabel(getAttributeValue(node, "title"));
    const testId = normalizeMediaLabel(getAttributeValue(node, "data-testid"));
    const className = normalizeMediaLabel(getAttributeValue(node, "class"));
    const candidate = alt || ariaLabel || title || testId || className;

    if (!candidate) {
      return false;
    }

    if (className.indexOf("emoji") !== -1) {
      return true;
    }

    if (!isEmojiOnlyText(candidate)) {
      return false;
    }

    if (className.indexOf("sticker") !== -1 || testId.indexOf("sticker") !== -1) {
      return false;
    }

    const parent = node.parentElement;
    const parentLabel = parent ? normalizeMediaLabel(getAttributeValue(parent, "class") || getAttributeValue(parent, "aria-label") || getAttributeValue(parent, "title") || getAttributeValue(parent, "data-testid")) : "";
    if (containsAnyLabel(parentLabel, ["sticker", "貼紙", "贴纸"])) {
      return false;
    }

    const textContainer = container || parent;
    if (textContainer && typeof textContainer.querySelectorAll === "function") {
      const selectableTextNodes = textContainer.querySelectorAll(".copyable-text, .selectable-text");
      for (let i = 0; i < selectableTextNodes.length; i += 1) {
        const textNode = selectableTextNodes[i];
        if (textNode === node) {
          continue;
        }
        const textContent = String(textNode.textContent || "").trim();
        if (textContent && !isEmojiOnlyText(textContent)) {
          return true;
        }
      }
    }

    return true;
  }

  function buildMediaDescriptor(node, kind) {
    let src = getAttributeValue(node, "src");
    let srcSet = getAttributeValue(node, "srcset") || getAttributeValue(node, "data-srcset");
    let altSrc = getAttributeValue(node, "data-src");
    let posterSrc = getAttributeValue(node, "poster");
    let hrefSrc = getAttributeValue(node, "href");
    const currentSrc =
      typeof node.currentSrc === "string" ? node.currentSrc : "";
    const nativeSrc = typeof node.src === "string" ? node.src : "";
    let nativePoster = typeof node.poster === "string" ? node.poster : "";
    const backgroundImageSrc = getBackgroundImageUrl(node);
    let zoomSrc = "";
    let assetSourceNode = node;
    const safeSrcCandidates = [
      src,
      altSrc,
      hrefSrc,
      posterSrc,
      currentSrc,
      nativeSrc,
      nativePoster,
      backgroundImageSrc
    ];

    if (!src) {
      src = pickAccessibleMediaUrl(safeSrcCandidates);
    }

    if (!src && typeof node.querySelectorAll === "function") {
      const descendant =
        findFirstMediaNode(node, "img") ||
        findFirstMediaNode(node, "video") ||
        findFirstMediaNode(node, "audio") ||
        findFirstMediaNode(node, "canvas");
      if (descendant) {
        assetSourceNode = descendant;
        const dSrc = getAttributeValue(descendant, "src");
        const dSrcSet = getAttributeValue(descendant, "srcset") || getAttributeValue(descendant, "data-srcset");
        const dDataSrc = getAttributeValue(descendant, "data-src");
        const dPoster = getAttributeValue(descendant, "poster");
        const dHref = getAttributeValue(descendant, "href");
        const dCurrent = typeof descendant.currentSrc === "string" ? descendant.currentSrc : "";
        const dNative = typeof descendant.src === "string" ? descendant.src : "";
        const dNativePoster = typeof descendant.poster === "string" ? descendant.poster : "";
        const dBackground = getBackgroundImageUrl(descendant);
        const descendantCandidates = [
          dSrc,
          dDataSrc,
          dHref,
          dPoster,
          dCurrent,
          dNative,
          dNativePoster,
          dBackground
        ];

        src =
          pickAccessibleMediaUrl(descendantCandidates.concat([backgroundImageSrc])) || src;

        if (!srcSet) {
          srcSet = dSrcSet;
        }

        if (!zoomSrc) {
          zoomSrc =
            pickAccessibleMediaUrl(
              [dDataSrc, dNative, dCurrent, dNativePoster, dPoster, dHref, dSrc, dBackground]
            );
        }

        altSrc = getAttributeValue(descendant, "data-src") || altSrc;
        nativePoster = typeof descendant.poster === "string" ? descendant.poster : nativePoster;
      }
    }

    if (!srcSet) {
      srcSet = getAttributeValue(node, "srcset") || getAttributeValue(node, "data-srcset");
    }

    if (!zoomSrc && srcSet) {
      zoomSrc = pickLargestSrcFromSrcSet(srcSet);
    }

    if (!zoomSrc) {
      zoomSrc =
        pickAccessibleMediaUrl(
          [altSrc, hrefSrc, posterSrc, currentSrc, nativeSrc, nativePoster, backgroundImageSrc, src]
        );
    }

    if (isTemporaryMediaUrl(src) && zoomSrc && !isTemporaryMediaUrl(zoomSrc)) {
      src = zoomSrc;
    }

    const alt =
      getAttributeValue(node, "alt") ||
      getAttributeValue(node, "aria-label") ||
      (typeof node.querySelector === "function" &&
      node.querySelector("img")
        ? getAttributeValue(node.querySelector("img"), "alt") ||
          getAttributeValue(node.querySelector("img"), "aria-label")
        : "");
    const mediaAssetCandidates = [
      src,
      zoomSrc,
      posterSrc,
      altSrc,
      hrefSrc,
      currentSrc,
      nativeSrc,
      nativePoster,
      backgroundImageSrc,
      getAttributeValue(assetSourceNode, "src"),
      getAttributeValue(assetSourceNode, "data-src"),
      getAttributeValue(assetSourceNode, "poster"),
      typeof assetSourceNode.currentSrc === "string" ? assetSourceNode.currentSrc : "",
      typeof assetSourceNode.src === "string" ? assetSourceNode.src : "",
      typeof assetSourceNode.poster === "string" ? assetSourceNode.poster : "",
      getBackgroundImageUrl(assetSourceNode)
    ];
    const assetDataUrl = extractMediaAssetDataUrl(assetSourceNode, kind, mediaAssetCandidates);
    const fullAssetDataUrl = extractFullMediaAssetDataUrl(assetSourceNode, kind, mediaAssetCandidates);

    return {
      kind: kind,
      src: src,
      alt: alt,
      poster:
        getAttributeValue(node, "poster") ||
        (typeof node.poster === "string" ? node.poster : ""),
      srcSet: srcSet,
      zoomSrc: zoomSrc,
      assetDataUrl: assetDataUrl,
      fullAssetDataUrl: fullAssetDataUrl
    };
  }

  function extractMediaAssetDataUrl(node, kind, candidates) {
    if (kind !== "image" && kind !== "sticker") {
      return "";
    }

    const encoded = encodeMediaNodeAsDataUrl(node, kind);
    if (encoded) {
      return encoded;
    }

    return pickPortableMediaDataUrl(candidates);
  }

  function extractFullMediaAssetDataUrl(node, kind, candidates) {
    if (kind !== "image" && kind !== "sticker") {
      return "";
    }

    const maxDimension =
      kind === "sticker" ? STICKER_ZOOM_ASSET_MAX_DIMENSION : MEDIA_ZOOM_ASSET_MAX_DIMENSION;
    const encoded = encodeMediaNodeAsDataUrl(
      node,
      kind,
      maxDimension,
      MEDIA_ZOOM_ASSET_MAX_DATA_URL_LENGTH
    );
    if (encoded) {
      return encoded;
    }

    return pickPortableMediaDataUrl(candidates, MEDIA_ZOOM_ASSET_MAX_DATA_URL_LENGTH);
  }

  function encodeMediaNodeAsDataUrl(node, kind, maxDimension, maxDataUrlLength) {
    const drawable = findDrawableMediaAssetNode(node);
    if (!drawable) {
      return "";
    }

    const tagName = typeof drawable.tagName === "string" ? drawable.tagName.toUpperCase() : "";
    if (tagName === "CANVAS") {
      return exportCanvasDataUrl(drawable, kind, maxDataUrlLength);
    }

    if (tagName !== "IMG") {
      return "";
    }

    if (drawable.complete === false) {
      return "";
    }

    const width = getDrawableDimension(drawable, "naturalWidth", "width");
    const height = getDrawableDimension(drawable, "naturalHeight", "height");
    if (!width || !height) {
      return "";
    }

    const canvas = createMediaCanvas(width, height, kind, maxDimension);
    if (!canvas) {
      return "";
    }

    try {
      const context = canvas.getContext("2d");
      if (!context || typeof context.drawImage !== "function") {
        return "";
      }
      context.drawImage(drawable, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      return "";
    }

    return exportCanvasDataUrl(canvas, kind, maxDataUrlLength);
  }

  function findDrawableMediaAssetNode(node) {
    if (!node) {
      return null;
    }

    const tagName = typeof node.tagName === "string" ? node.tagName.toUpperCase() : "";
    if (tagName === "IMG" || tagName === "CANVAS") {
      return node;
    }

    if (typeof node.querySelector === "function") {
      return node.querySelector("img") || node.querySelector("canvas");
    }

    return null;
  }

  function getDrawableDimension(node, primaryName, fallbackName) {
    const primary = typeof node[primaryName] === "number" ? node[primaryName] : 0;
    if (primary > 0) {
      return primary;
    }

    const fallback = typeof node[fallbackName] === "number" ? node[fallbackName] : 0;
    return fallback > 0 ? fallback : 0;
  }

  function createMediaCanvas(width, height, kind, maxDimension) {
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
      return null;
    }

    const canvas = document.createElement("canvas");
    if (!canvas || typeof canvas.getContext !== "function") {
      return null;
    }

    const dimensionLimit =
      typeof maxDimension === "number" && maxDimension > 0
        ? maxDimension
        : kind === "sticker"
          ? STICKER_ASSET_MAX_DIMENSION
          : MEDIA_ASSET_MAX_DIMENSION;
    const scale = Math.min(1, dimensionLimit / width, dimensionLimit / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    return canvas;
  }

  function exportCanvasDataUrl(canvas, kind, maxDataUrlLength) {
    if (!canvas || typeof canvas.toDataURL !== "function") {
      return "";
    }

    const preferredType = kind === "sticker" ? "image/webp" : "image/jpeg";
    const quality = kind === "sticker" ? 0.92 : 0.82;
    const candidates = [];

    try {
      candidates.push(canvas.toDataURL(preferredType, quality));
    } catch (e) {}

    if (preferredType !== "image/png") {
      try {
        candidates.push(canvas.toDataURL("image/png"));
      } catch (e) {}
    }

    return pickPortableMediaDataUrl(candidates, maxDataUrlLength);
  }

  function pickPortableMediaDataUrl(candidates, maxDataUrlLength) {
    if (!Array.isArray(candidates)) {
      return "";
    }

    const lengthLimit =
      typeof maxDataUrlLength === "number" && maxDataUrlLength > 0
        ? maxDataUrlLength
        : MEDIA_ASSET_MAX_DATA_URL_LENGTH;
    for (let i = 0; i < candidates.length; i += 1) {
      const value = typeof candidates[i] === "string" ? candidates[i].trim() : "";
      if (
        isPortableMediaDataUrl(value) &&
        value.length <= lengthLimit
      ) {
        return value;
      }
    }

    return "";
  }

  function isPortableMediaDataUrl(value) {
    return typeof value === "string" && /^data:image\//i.test(value.trim());
  }

  function pickAccessibleMediaUrl(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return "";
    }

    for (let i = 0; i < candidates.length; i += 1) {
      const value = typeof candidates[i] === "string" ? candidates[i].trim() : "";
      if (value && !isTemporaryMediaUrl(value)) {
        return value;
      }
    }

    for (let i = 0; i < candidates.length; i += 1) {
      const value = typeof candidates[i] === "string" ? candidates[i].trim() : "";
      if (value) {
        return value;
      }
    }

    return "";
  }

  function isTemporaryMediaUrl(value) {
    if (typeof value !== "string") {
      return true;
    }
    const normalized = value.trim();
    if (!normalized) return true;
    return /^(blob:|data:)/i.test(normalized);
  }

  function pickLargestSrcFromSrcSet(srcSet) {
    const candidates = extractSrcSetCandidates(srcSet);
    if (candidates.length === 0) {
      return "";
    }

    const widthSorted = candidates
      .filter(function (entry) {
        return typeof entry.width === "number" && entry.width > 0;
      })
      .sort(function (a, b) {
        return b.width - a.width;
      });

    if (widthSorted.length > 0) {
      return widthSorted[0].url;
    }

    const densitySorted = candidates
      .filter(function (entry) {
        return typeof entry.density === "number" && entry.density > 0;
      })
      .sort(function (a, b) {
        return b.density - a.density;
      });

    if (densitySorted.length > 0) {
      return densitySorted[0].url;
    }

    return candidates[0].url;
  }

  function extractSrcSetCandidates(srcSet) {
    if (!srcSet || typeof srcSet !== "string") {
      return [];
    }

    return srcSet
      .split(",")
      .map(function (entry) {
        const trimmed = (entry || "").trim();
        if (!trimmed) {
          return null;
        }

        const parts = trimmed.split(/\s+/);
        const url = parts[0];
        let width = null;
        let density = null;

        for (let i = 1; i < parts.length; i += 1) {
          const token = parts[i];
          if (token.endsWith("w")) {
            const parsed = parseFloat(token.slice(0, -1));
            if (!Number.isNaN(parsed) && parsed > 0) {
              width = parsed;
            }
          } else if (token.endsWith("x")) {
            const parsed = parseFloat(token.slice(0, -1));
            if (!Number.isNaN(parsed) && parsed > 0) {
              density = parsed;
            }
          }
        }

        return { url: url, width: width, density: density };
      })
      .filter(function (candidate) {
        return candidate && candidate.url;
      });
  }

  function getBackgroundImageUrl(node) {
    if (!node || typeof node.style !== "object") {
      return "";
    }

    const styleValue = typeof node.style.backgroundImage === "string" ? node.style.backgroundImage : "";
    const match = styleValue.match(/url\\(["']?([^"')]+)["']?\\)/i);
    return match && match[1] ? match[1] : "";
  }

  function normalizeMediaLabel(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/_/g, "");
  }

  function containsAnyLabel(normalizedLabel, keywords) {
    if (!normalizedLabel) {
      return false;
    }

    for (let i = 0; i < keywords.length; i += 1) {
      const keyword = normalizeMediaLabel(keywords[i]);
      if (keyword && normalizedLabel.indexOf(keyword) !== -1) {
        return true;
      }
    }

    return false;
  }

  function findLabeledMediaDescriptor(container) {
    if (!container || typeof container.querySelectorAll !== "function") {
      return null;
    }

    const rootDescriptor = describeLabeledMediaNode(container);
    if (rootDescriptor) {
      return rootDescriptor;
    }

    const candidates = container.querySelectorAll(
      '[role="img"], [aria-label], [title], [alt], [data-testid], [class], [style]'
    );

    for (let i = 0; i < candidates.length; i += 1) {
      if (isQuotedPreviewNode(candidates[i], container)) {
        continue;
      }

      let current = candidates[i];
      while (current) {
        if (current !== container && hasQuotedPreviewMarker(current)) {
          break;
        }

        const candidateDescriptor = describeLabeledMediaNode(current);
        if (candidateDescriptor) {
          return candidateDescriptor;
        }

        if (current === container) {
          break;
        }

        current = current.parentElement;
      }
    }

    return null;
  }

  function shouldSuppressMediaCaption(normalizedCaption, kind) {
    if (!normalizedCaption) {
      return true;
    }

    const compact = normalizeMediaLabel(normalizedCaption);

    switch (kind) {
      case "sticker":
        return (
          compact === "sticker" ||
          compact === "贴纸" ||
          compact === "貼紙" ||
          compact === "stickermessage" ||
          compact.indexOf("sticker") !== -1 ||
          isEmojiOnlyText(normalizedCaption)
        );
      case "image":
        return (
          compact === "image" ||
          compact === "photo" ||
          compact === "picture" ||
          compact === "图片" ||
          compact === "圖片" ||
          compact.indexOf("image") !== -1 ||
          compact.indexOf("photo") !== -1 ||
          compact.indexOf("picture") !== -1
        );
      case "video":
        return compact === "video" || compact.indexOf("video") !== -1;
      case "audio":
        return (
          compact === "audio" ||
          compact === "voice" ||
          compact === "ptt" ||
          compact.indexOf("audio") !== -1 ||
          compact.indexOf("voice") !== -1 ||
          compact.indexOf("ptt") !== -1
        );
      default:
        return false;
    }
  }

  function getRenderableMessageText(msg) {
    const text = msg && typeof msg.text === "string" ? msg.text.trim() : "";
    if (!text) {
      return "";
    }

    const fallbackText = getMessageFallbackText(msg);
    if (fallbackText && text === fallbackText) {
      return "";
    }

    return text;
  }

  function getContainerMediaLabel(container) {
    if (!container) {
      return "";
    }

    return (
      getAttributeValue(container, "aria-label") ||
      getAttributeValue(container, "title") ||
      getAttributeValue(container, "data-testid") ||
      getAttributeValue(container, "class")
    );
  }

  function getMessageFallbackText(msg) {
    if (!msg) {
      return "";
    }

    if (typeof msg.fallbackText === "string" && msg.fallbackText.trim()) {
      return msg.fallbackText.trim();
    }

    const kind = getMessageKind(msg);
    if (kind) {
      return getMediaFallbackText(kind);
    }

    return "";
  }

  function getMessageKind(msg) {
    if (!msg) {
      return "";
    }

    if (typeof msg.kind === "string" && msg.kind.trim()) {
      return msg.kind.trim();
    }

    if (msg.media && typeof msg.media.kind === "string" && msg.media.kind.trim()) {
      return msg.media.kind.trim();
    }

    return "";
  }

  function getMediaFallbackText(kind) {
    switch (kind) {
      case "sticker":
        return "贴纸";
      case "image":
        return "图片";
      case "video":
        return "[Video]";
      case "audio":
        return "[Voice]";
      default:
        return "[Media]";
    }
  }

  function isEmojiOnlyText(value) {
    const compact = String(value || "").trim();
    if (!compact) {
      return false;
    }

    const chars = Array.from(compact);
    if (chars.length > 4) {
      return false;
    }

    return !/[A-Za-z0-9\u4e00-\u9fff]/.test(compact);
  }

  function debugBookmarkMedia(stage, data) {
    try {
      console.log("[BookmarkBarMedia]", stage, data);
    } catch (e) {
      // ignore
    }
  }

  function renderMessageMedia(container, msg) {
    const media = msg && msg.media;
    const kind = getMessageKind(msg);
    if (!media || !kind) {
      debugBookmarkMedia("render-skip", {
        kind: kind,
        text: msg && msg.text ? msg.text : "",
        fallbackText: getMessageFallbackText(msg),
        mediaSrc: media && media.src ? media.src : ""
      });
      return false;
    }

    const fallbackText = getMessageFallbackText(msg);
    const src = typeof media.src === "string" ? media.src.trim() : "";
    const poster = typeof media.poster === "string" ? media.poster.trim() : "";
    const displaySrc = getMediaDisplaySrc(kind, media);

    if (kind === "sticker" && !displaySrc) {
      renderMediaFallbackBadge(container, msg, fallbackText);
      debugBookmarkMedia("render-fallback", {
        kind: kind,
        reason: "missing-src",
        text: msg && msg.text ? msg.text : "",
        fallbackText: fallbackText,
        mediaAlt: media.alt || ""
      });
      return true;
    }

    const tagName = kind === "video" ? "video" : kind === "audio" ? "audio" : "img";

    if (kind === "video" || kind === "audio") {
      if (!src) {
        return false;
      }
    } else if (!displaySrc) {
      return false;
    }

    const mediaNode = document.createElement(tagName);
    mediaNode.className = "wa-bookmark-bar__message-media-asset";
    mediaNode.setAttribute("data-message-kind", kind);
    if (fallbackText) {
      mediaNode.setAttribute("alt", media.alt || fallbackText);
    }
    if (kind === "video" || kind === "audio") {
      mediaNode.controls = true;
    }
    if (kind === "image" || kind === "sticker") {
      const altText = media && (media.alt || "").trim();
      mediaNode.style.cursor = "zoom-in";
      mediaNode.tabIndex = 0;
      mediaNode.setAttribute("role", "button");
      mediaNode.setAttribute("aria-label", altText || "Open image preview");
      const zoomTarget = getMediaZoomSrc(kind, media, displaySrc);

      mediaNode.addEventListener("click", function () {
        openMediaZoom(zoomTarget, altText);
      });
      mediaNode.addEventListener("keydown", function (event) {
        const key = event && event.key ? event.key : "";
        if (key === "Enter" || key === " ") {
          event.preventDefault();
          openMediaZoom(zoomTarget, altText);
        }
      });
    }
    if (kind === "video" && poster) {
      mediaNode.setAttribute("poster", poster);
    }
    mediaNode.src = displaySrc;
    container.appendChild(mediaNode);
    debugBookmarkMedia("render", {
      kind: kind,
      src: src,
      alt: media.alt || "",
      text: msg && msg.text ? msg.text : "",
      fallbackText: fallbackText
    });
    return true;
  }

  function getMediaDisplaySrc(kind, media) {
    const assetDataUrl = getMediaAssetDataUrl(media);
    if (assetDataUrl) {
      return assetDataUrl;
    }

    const src = typeof media.src === "string" ? media.src.trim() : "";
    const zoomSrc = typeof media.zoomSrc === "string" ? media.zoomSrc.trim() : "";
    const poster = typeof media.poster === "string" ? media.poster.trim() : "";

    if (kind === "sticker" && !isWhatsApp) {
      return pickPortableMediaDataUrl([src, zoomSrc, poster]);
    }

    return src || zoomSrc || poster;
  }

  function getMediaZoomSrc(kind, media, displaySrc) {
    if (kind === "image") {
      const highResolutionSrc = getHighResolutionMediaSrc(media);
      if (highResolutionSrc) {
        return highResolutionSrc;
      }

      const fullAssetDataUrl = getMediaFullAssetDataUrl(media);
      if (fullAssetDataUrl) {
        return fullAssetDataUrl;
      }

      const persistentFallbackSrc =
        media && typeof media === "object"
          ? pickPersistentMediaUrl([media.src, media.poster])
          : "";
      if (persistentFallbackSrc) {
        return persistentFallbackSrc;
      }
    }

    const assetDataUrl = getMediaAssetDataUrl(media);
    if (assetDataUrl) {
      return assetDataUrl;
    }

    if (kind === "sticker" && !isWhatsApp) {
      return pickPortableMediaDataUrl([
        media && media.zoomSrc,
        media && media.src,
        media && media.poster,
        displaySrc
      ]);
    }

    const zoomSrc = media && typeof media.zoomSrc === "string" ? media.zoomSrc.trim() : "";
    return zoomSrc || displaySrc || "";
  }

  function getHighResolutionMediaSrc(media) {
    if (!media || typeof media !== "object") {
      return "";
    }

    return pickPersistentMediaUrl([media.zoomSrc, media.fullSizeSrc]);
  }

  function getMediaFullAssetDataUrl(media) {
    if (!media || typeof media !== "object") {
      return "";
    }

    return pickPortableMediaDataUrl(
      [media.fullAssetDataUrl, media.fullDataUrl],
      MEDIA_ZOOM_ASSET_MAX_DATA_URL_LENGTH
    );
  }

  function getMediaAssetDataUrl(media) {
    if (!media || typeof media !== "object") {
      return "";
    }

    return pickPortableMediaDataUrl([media.assetDataUrl, media.dataUrl]);
  }

  function pickPersistentMediaUrl(candidates) {
    if (!Array.isArray(candidates)) {
      return "";
    }

    for (let i = 0; i < candidates.length; i += 1) {
      const value = typeof candidates[i] === "string" ? candidates[i].trim() : "";
      if (value && !isTemporaryMediaUrl(value)) {
        return value;
      }
    }

    return "";
  }

  function renderMediaFallbackBadge(container, msg, fallbackText) {
    const media = msg && msg.media;
    const badge = document.createElement("div");
    badge.className = "wa-bookmark-bar__message-media-fallback";
    badge.setAttribute("data-message-kind", getMessageKind(msg) || "media");
    badge.textContent =
      (media && typeof media.alt === "string" && media.alt.trim()) ||
      fallbackText ||
      "贴纸";
    container.appendChild(badge);
    return badge;
  }

  function openMediaZoom(imageSrc, imageAlt) {
    if (typeof imageSrc !== "string" || !imageSrc.trim()) {
      return;
    }

    closeMediaZoom();

    const overlay = document.createElement("div");
    overlay.className = "wa-bookmark-bar__media-zoom-overlay";
    overlay.tabIndex = 0;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.position = "fixed";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.right = "0";
    overlay.style.bottom = "0";
    overlay.style.background = "rgba(0, 0, 0, 0.88)";
    overlay.style.zIndex = "2147483647";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "24px";
    overlay.style.boxSizing = "border-box";
    overlay.style.cursor = "zoom-out";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 140ms ease";

    const panel = document.createElement("div");
    panel.style.maxWidth = "100%";
    panel.style.maxHeight = "100%";
    panel.style.position = "relative";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.alignItems = "center";

    const image = document.createElement("img");
    image.className = "wa-bookmark-bar__media-zoom-image";
    image.src = imageSrc;
    image.alt = imageAlt || "";
    image.style.maxWidth = "min(96vw, 100%)";
    image.style.maxHeight = "90vh";
    image.style.borderRadius = "8px";
    image.style.objectFit = "contain";
    image.style.boxShadow = "0 24px 64px rgba(0, 0, 0, 0.45)";
    image.style.background = "#fff";
    image.style.display = "block";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close image preview");
    close.style.position = "absolute";
    close.style.right = "0";
    close.style.top = "-40px";
    close.style.border = "0";
    close.style.background = "#fff";
    close.style.color = "#111";
    close.style.width = "34px";
    close.style.height = "34px";
    close.style.borderRadius = "50%";
    close.style.cursor = "pointer";
    close.style.fontSize = "24px";
    close.style.lineHeight = "34px";
    close.style.padding = "0";
    close.style.fontWeight = "600";

    const caption = document.createElement("div");
    caption.className = "wa-bookmark-bar__media-zoom-caption";
    caption.style.maxWidth = "min(96vw, 100%)";
    caption.style.marginTop = "10px";
    caption.style.color = "#fff";
    caption.style.fontSize = "13px";
    caption.style.opacity = "0.92";
    caption.style.textAlign = "center";
    caption.style.wordBreak = "break-all";
    if (imageAlt) {
      caption.textContent = imageAlt;
      panel.appendChild(caption);
    }

    panel.appendChild(close);
    panel.appendChild(image);

    overlay.appendChild(panel);
    if (document && document.body) {
      document.body.appendChild(overlay);
      mediaZoomOverlay = overlay;
      window.setTimeout(function () {
        overlay.style.opacity = "1";
      }, 0);
      document.addEventListener("keydown", onMediaZoomKeydown);
      try {
        overlay.focus();
      } catch (e) {}
    }

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closeMediaZoom();
      }
    });
    close.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMediaZoom();
    });
    image.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  function onMediaZoomKeydown(event) {
    const key = event && event.key ? event.key : "";
    if (key === "Escape") {
      closeMediaZoom();
    }
  }

  function closeMediaZoom() {
    if (!mediaZoomOverlay) {
      return;
    }

    if (mediaZoomOverlay.parentNode && typeof mediaZoomOverlay.parentNode.removeChild === "function") {
      mediaZoomOverlay.parentNode.removeChild(mediaZoomOverlay);
    }

    document.removeEventListener("keydown", onMediaZoomKeydown);
    mediaZoomOverlay = null;
  }

  function filterContainedElements(elements) {
    const contained = new Set();
    for (let i = 0; i < elements.length; i += 1) {
      if (contained.has(elements[i])) continue;
      for (let j = i + 1; j < elements.length; j += 1) {
        if (elements[i].contains(elements[j])) {
          contained.add(elements[j]);
        } else if (elements[j].contains(elements[i])) {
          contained.add(elements[i]);
          break;
        }
      }
    }
    return elements.filter(function (el) {
      return !contained.has(el);
    });
  }

  function extractFromElements(elements) {
    const parts = [];
    for (let i = 0; i < elements.length; i += 1) {
      const part = extractRichText(elements[i]);
      if (part) {
        parts.push(part);
      }
    }
    return parts;
  }

  function extractRichText(element) {
    if (!element) return "";

    // Real DOM: walk childNodes so that <img alt="👋"> inside text spans
    // is preserved as the emoji character.
    if (typeof element.childNodes !== "undefined" && element.childNodes) {
      let result = "";
      Array.from(element.childNodes).forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent || "";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "IMG") {
            const alt = node.getAttribute("alt");
            if (alt) result += alt;
          } else {
            result += extractRichText(node);
          }
        }
      });
      return result.trim();
    }

    // Test fallback: use textContent plus any <img> alt from children.
    let result = element.textContent || "";
    if (element.children) {
      element.children.forEach(function (child) {
        if (child.tagName === "img") {
          const alt =
            typeof child.getAttribute === "function"
              ? child.getAttribute("alt")
              : "";
          if (alt) result += alt;
        }
      });
    }
    return result.trim();
  }

  function extractMessageSender(container) {
    const senderEl = container.querySelector('[data-testid="author"]');
    return senderEl ? senderEl.textContent.trim() : "";
  }

  function extractTimestampLabel(container) {
    const timeEl =
      container.querySelector('[data-testid="msg-meta"]') ||
      container.querySelector("time") ||
      container.querySelector("[aria-label]");
    if (timeEl && timeEl.textContent) {
      return timeEl.textContent.trim();
    }

    const stampedNode =
      container.querySelector(".copyable-text") || container.querySelector("[data-pre-plain-text]");
    const plainText =
      stampedNode && typeof stampedNode.getAttribute === "function"
        ? stampedNode.getAttribute("data-pre-plain-text")
        : "";
    const match = plainText ? plainText.match(/\[(.*?)\]/) : null;
    return match ? match[1] : "";
  }

  function buildMessageId(container, text, timestampLabel) {
    if (typeof container.getAttribute === "function") {
      const attrId =
        container.getAttribute("data-message-id") || container.getAttribute("data-id");
      if (attrId) {
        return attrId;
      }
    }

    return [timestampLabel || "unknown-time", text || "message"].join(":");
  }

  function getPanelStatusText() {
    const parts = [];

    if (cachedBookmarkData && cachedBookmarkData.updatedAt) {
      parts.push("Synced " + formatRelativeTime(cachedBookmarkData.updatedAt));
    } else {
      parts.push("No sync yet");
    }

    if (currentSendAvailability === true) {
      parts.push("Live send ready");
    } else if (currentSendAvailability === false) {
      parts.push("Read-only cache");
    }

    if (panelSendFeedback) {
      parts.push(panelSendFeedback);
    }

    return parts.join(" · ");
  }

  function formatRelativeTime(value) {
    const timestamp = typeof value === "number" ? value : 0;
    if (!timestamp) {
      return "";
    }

    const diffMs = Math.max(0, Date.now() - timestamp);
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    if (diffMs < 30 * 1000) {
      return "just now";
    }
    if (diffMs < hourMs) {
      const minutes = Math.max(1, Math.round(diffMs / minuteMs));
      return minutes + " min ago";
    }
    if (diffMs < dayMs) {
      const hours = Math.max(1, Math.round(diffMs / hourMs));
      return hours + " hr ago";
    }

    const days = Math.max(1, Math.round(diffMs / dayMs));
    if (days < 7) {
      return days + " d ago";
    }

    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(timestamp));
    } catch (e) {
      return new Date(timestamp).toLocaleString();
    }
  }

  async function checkSendAvailability() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "BOOKMARK_BAR_STATUS"
      });
      return !!(response && response.ok && response.available);
    } catch (e) {
      return false;
    }
  }

  function setPanelComposerState(enabled) {
    if (!activePanel) {
      return;
    }

    const input = activePanel.querySelector(".wa-bookmark-bar__panel-input");
    const sendBtn = activePanel.querySelector(".wa-bookmark-bar__panel-send");
    const inputArea = activePanel.querySelector(".wa-bookmark-bar__panel-input-area");

    if (input) {
      input.disabled = !enabled;
      input.placeholder = enabled ? "Type a message..." : "Open WhatsApp Web to send";
    }

    if (sendBtn) {
      sendBtn.disabled = !enabled;
    }

    const emojiBtn = activePanel.querySelector(".wa-bookmark-bar__panel-emoji-btn");
    if (emojiBtn) {
      emojiBtn.disabled = !enabled;
      if (!enabled && typeof emojiBtn._closeEmojiPicker === "function") {
        emojiBtn._closeEmojiPicker();
      }
    }

    if (!inputArea) {
      return;
    }

    const existingNotice = inputArea.querySelector(".wa-bookmark-bar__panel-notice");
    if (enabled) {
      if (existingNotice) {
        existingNotice.remove();
      }
      return;
    }

    if (existingNotice) {
      existingNotice.textContent = "Open WhatsApp Web to send messages.";
      return;
    }

    const notice = document.createElement("div");
    notice.className = "wa-bookmark-bar__panel-notice";
    notice.textContent = "Open WhatsApp Web to send messages.";
    inputArea.appendChild(notice);
  }

  function setPanelComposerPending(pending) {
    if (!activePanel) {
      return;
    }

    const input = activePanel.querySelector(".wa-bookmark-bar__panel-input");
    const sendBtn = activePanel.querySelector(".wa-bookmark-bar__panel-send");
    const emojiBtn = activePanel.querySelector(".wa-bookmark-bar__panel-emoji-btn");

    if (input) {
      input.disabled = pending;
    }
    if (sendBtn) {
      sendBtn.disabled = pending;
    }
    if (emojiBtn) {
      emojiBtn.disabled = pending;
    }
  }

  function setPanelSendFeedback(message) {
    panelSendFeedback = typeof message === "string" ? message : "";
    updatePanelStatus();
  }

  function updatePanelStatus() {
    if (!activePanel) {
      return;
    }

    const status = activePanel.querySelector(".wa-bookmark-bar__panel-status");
    if (!status) {
      return;
    }

    status.textContent = getPanelStatusText();
  }

  // ─── Emoji picker ───

  function createEmojiPickerButton(input, inputArea) {
    const emojiBtn = document.createElement("button");
    emojiBtn.className = "wa-bookmark-bar__panel-emoji-btn";
    emojiBtn.type = "button";
    emojiBtn.title = "Insert emoji";
    emojiBtn.setAttribute("aria-label", "Insert emoji");
    emojiBtn.textContent = "😊";

    const picker = document.createElement("div");
    picker.className = "wa-bookmark-bar__emoji-picker";
    picker.style.display = "none";

    const header = document.createElement("div");
    header.className = "wa-bookmark-bar__emoji-picker-header";
    header.textContent = "Emoji";

    const scroll = document.createElement("div");
    scroll.className = "wa-bookmark-bar__emoji-picker-scroll";

    EMOJI_CATEGORIES.forEach(function (category) {
      const label = document.createElement("div");
      label.className = "wa-bookmark-bar__emoji-picker-label";
      label.textContent = category.label;
      scroll.appendChild(label);

      const grid = document.createElement("div");
      grid.className = "wa-bookmark-bar__emoji-picker-grid";

      const chars = Array.from(category.emojis);
      chars.forEach(function (char) {
        const btn = document.createElement("button");
        btn.className = "wa-bookmark-bar__emoji-picker-item";
        btn.type = "button";
        btn.textContent = char;
        btn.title = char;
        btn.addEventListener("click", function (event) {
          event.stopPropagation();
          insertEmojiAtCursor(input, char);
        });
        grid.appendChild(btn);
      });

      scroll.appendChild(grid);
    });

    picker.appendChild(header);
    picker.appendChild(scroll);
    inputArea.appendChild(picker);

    function togglePicker(event) {
      if (event) event.stopPropagation();
      const isHidden = picker.style.display === "none";
      picker.style.display = isHidden ? "flex" : "none";
      if (isHidden) {
        input.focus();
      }
    }

    function closePicker() {
      picker.style.display = "none";
    }

    emojiBtn.addEventListener("click", togglePicker);

    emojiBtn._closeEmojiPicker = closePicker;

    return emojiBtn;
  }

  function insertEmojiAtCursor(input, emoji) {
    if (!input) return;

    const start = typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    const end = typeof input.selectionEnd === "number" ? input.selectionEnd : input.value.length;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);

    input.value = before + emoji + after;

    try {
      input.focus();
      const newCursor = start + Array.from(emoji).length;
      input.setSelectionRange(newCursor, newCursor);
    } catch (e) {
      // ignore in tests or unsupported environments
    }
  }

  // ─── Listen for extension messages ───

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (!message) return;

      if (message.type === "BOOKMARK_BAR_APPLY") {
        if (message.enabled) {
          create();
        } else {
          destroy();
        }
        return;
      }

      if (message.type === "BOOKMARK_BAR_REQUEST_CHATS" && isWhatsApp) {
        window.setTimeout(function () {
          const chats = extractChatsFromWhatsApp();
          const pureChats = chats.map(function (c) {
            return { id: c.id, name: c.name, preview: c.preview, avatar: c.avatar };
          });
          if (pureChats.length > 0) {
            void persistChatList(pureChats).catch(function (error) {
              logBookmarkBarAsyncError("BookmarkBar: persist chat list error", error);
            });
          }
        }, 0);
        return;
      }

      if (message.type === "BOOKMARK_BAR_SEND" && isWhatsApp) {
        window.setTimeout(function () {
          let targetChat = findChatById(message.chatId);
          if (!targetChat && message.chatName) {
            targetChat = findChatByName(message.chatName);
          }
          if (targetChat) {
            sendMessageLocal(targetChat, message.text)
              .then(function (sent) {
                sendResponse({ ok: sent === true });
              })
              .catch(function (error) {
                sendResponse({
                  ok: false,
                  error: error && error.message ? error.message : String(error)
                });
              });
          } else {
            // Fallback: search by element
            const el = findChatElementById(message.chatId);
            if (el) {
              const titleEl = el.querySelector('[data-testid="cell-frame-title"]');
              const fallbackChat = {
                id: message.chatId,
                name: titleEl ? titleEl.textContent.trim() : "",
                preview: "",
                avatar: null,
                element: el
              };
              sendMessageLocal(fallbackChat, message.text)
                .then(function (sent) {
                  sendResponse({ ok: sent === true });
                })
                .catch(function (error) {
                  sendResponse({
                    ok: false,
                    error: error && error.message ? error.message : String(error)
                  });
                });
            } else {
              sendResponse({ ok: false, error: "Chat not found" });
            }
          }
        }, 0);
        return true;
      }

      if (message.type === "BOOKMARK_BAR_SYNC" && isWhatsApp) {
        window.setTimeout(function () {
          updateFromWhatsApp();
        }, 0);
        return;
      }

      if (message.type === "BOOKMARK_BAR_SWITCH_CHAT" && isWhatsApp) {
        window.setTimeout(function () {
          let targetChat = findChatById(message.chatId);
          if (!targetChat && message.chatName) {
            targetChat = findChatByName(message.chatName);
          }
          if (targetChat && targetChat.element) {
            switchToChat(targetChat);
            // After switching, give WhatsApp a moment to load messages,
            // then immediately sync them so non-WhatsApp panels can refresh.
            window.setTimeout(function () {
              if (isMainPanelShowingChat(targetChat)) {
                const messages = extractMessagesFromMainPanel();
                if (messages.length > 0) {
                  void persistChatMessages(targetChat.id, messages).catch(function (error) {
                    logBookmarkBarAsyncError("BookmarkBar: switch chat persist error", error);
                  });
                }
              }
            }, 1500);
          } else {
            console.log("[BookmarkBar] SWITCH_CHAT: chat not found", message.chatId, message.chatName);
          }
        }, 0);
        return;
      }
    });
  }

  return {
    create: create,
    destroy: destroy,
    isActive: isActive,
    update: isWhatsApp ? updateFromWhatsApp : updateFromStorage
  };
});
