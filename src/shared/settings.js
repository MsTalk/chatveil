(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurSettings = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STORAGE_KEY = "waPrivacyBlurSettings";
  const TARGET_ORDER = [
    "contactList",
    "chatText",
    "avatars",
    "previewText",
    "mediaPreviews",
    "voiceMessages",
    "timestamps",
    "otherUi"
  ];

  const PRESET_ORDER = ["work", "presentation", "private", "minimal"];
  const BOOKMARK_BAR_THEMES = ["classic", "sunset", "midnight", "paper"];
  const LANGUAGE_ORDER = ["en", "zh-Hant", "zh-Hans"];
  const POPUP_SECTION_ORDER = [
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
  ];
  const DESKTOP_PET_MODES = ["quiet", "reactive", "interactive", "hybrid"];
  const DESKTOP_PET_CORNERS = [
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left"
  ];
  const DESKTOP_PET_SIZES = ["small", "medium", "large"];

  const PRESET_DEFINITIONS = Object.freeze({
    work: Object.freeze({
      hoverReveal: true,
      holdRevealEnabled: true,
      idleBlurEnabled: false,
      bookmarkBarEnabled: true,
      bookmarkBarTheme: "classic",
      blurTargets: Object.freeze({
        contactList: true,
        chatText: true,
        avatars: true,
        previewText: true,
        mediaPreviews: true,
        voiceMessages: true,
        timestamps: false,
        otherUi: false
      })
    }),
    presentation: Object.freeze({
      hoverReveal: false,
      holdRevealEnabled: false,
      idleBlurEnabled: true,
      idleTimeoutMs: 10000,
      bookmarkBarEnabled: false,
      bookmarkBarTheme: "paper",
      blurTargets: Object.freeze({
        contactList: true,
        chatText: true,
        avatars: true,
        previewText: true,
        mediaPreviews: true,
        voiceMessages: true,
        timestamps: true,
        otherUi: true
      })
    }),
    private: Object.freeze({
      hoverReveal: false,
      holdRevealEnabled: false,
      idleBlurEnabled: true,
      bookmarkBarEnabled: false,
      bookmarkBarTheme: "midnight",
      blurTargets: Object.freeze({
        contactList: true,
        chatText: true,
        avatars: true,
        previewText: true,
        mediaPreviews: true,
        voiceMessages: true,
        timestamps: true,
        otherUi: true
      })
    }),
    minimal: Object.freeze({
      hoverReveal: true,
      holdRevealEnabled: true,
      idleBlurEnabled: false,
      bookmarkBarEnabled: false,
      bookmarkBarTheme: "sunset",
      blurTargets: Object.freeze({
        contactList: false,
        chatText: true,
        avatars: false,
        previewText: true,
        mediaPreviews: true,
        voiceMessages: true,
        timestamps: false,
        otherUi: false
      })
    })
  });

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
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
    pinnedContacts: Object.freeze([]),
    contactAliases: Object.freeze({}),
    pinnedContactGroups: Object.freeze([]),
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
    popupExpandedSections: Object.freeze({
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
    }),
    blurTargets: Object.freeze({
      contactList: true,
      chatText: true,
      avatars: true,
      previewText: true,
      mediaPreviews: true,
      voiceMessages: true,
      timestamps: false,
      otherUi: false
    })
  });

  function cloneSettings(settings) {
    return mergeSettings(settings);
  }

  function mergeSettings(raw) {
    const source = raw || {};
    const sourceTargets = source.blurTargets || {};
    const sourceAliases = source.contactAliases;
    const sourceGroups = source.pinnedContactGroups;
    const sourcePopupExpandedSections = source.popupExpandedSections || {};

    return {
      enabled: typeof source.enabled === "boolean" ? source.enabled : DEFAULT_SETTINGS.enabled,
      hoverReveal:
        typeof source.hoverReveal === "boolean" ? source.hoverReveal : DEFAULT_SETTINGS.hoverReveal,
      holdRevealEnabled:
        typeof source.holdRevealEnabled === "boolean"
          ? source.holdRevealEnabled
          : DEFAULT_SETTINGS.holdRevealEnabled,
      idleBlurEnabled:
        typeof source.idleBlurEnabled === "boolean"
          ? source.idleBlurEnabled
          : DEFAULT_SETTINGS.idleBlurEnabled,
      idleTimeoutMs:
        typeof source.idleTimeoutMs === "number" && source.idleTimeoutMs > 0
          ? source.idleTimeoutMs
          : DEFAULT_SETTINGS.idleTimeoutMs,
      temporaryRevealSeconds:
        typeof source.temporaryRevealSeconds === "number" && source.temporaryRevealSeconds > 0
          ? source.temporaryRevealSeconds
          : DEFAULT_SETTINGS.temporaryRevealSeconds,
      language:
        typeof source.language === "string" && LANGUAGE_ORDER.includes(source.language)
          ? source.language
          : DEFAULT_SETTINGS.language,
      bookmarkBarEnabled:
        typeof source.bookmarkBarEnabled === "boolean"
          ? source.bookmarkBarEnabled
          : DEFAULT_SETTINGS.bookmarkBarEnabled,
      keepWhatsAppAlive:
        typeof source.keepWhatsAppAlive === "boolean"
          ? source.keepWhatsAppAlive
          : DEFAULT_SETTINGS.keepWhatsAppAlive,
      activePreset:
        typeof source.activePreset === "string" && PRESET_ORDER.includes(source.activePreset)
          ? source.activePreset
          : DEFAULT_SETTINGS.activePreset,
      bookmarkBarTheme:
        typeof source.bookmarkBarTheme === "string" &&
        BOOKMARK_BAR_THEMES.includes(source.bookmarkBarTheme)
          ? source.bookmarkBarTheme
          : DEFAULT_SETTINGS.bookmarkBarTheme,
      pinnedContacts: Array.isArray(source.pinnedContacts)
        ? source.pinnedContacts.slice()
        : DEFAULT_SETTINGS.pinnedContacts.slice(),
      contactAliases: normalizeAliasMap(sourceAliases),
      pinnedContactGroups: normalizePinnedContactGroups(sourceGroups),
      bookmarkBarColor:
        typeof source.bookmarkBarColor === "string" && source.bookmarkBarColor.length > 0
          ? source.bookmarkBarColor
          : DEFAULT_SETTINGS.bookmarkBarColor,
      cinematicBlurEnabled:
        typeof source.cinematicBlurEnabled === "boolean"
          ? source.cinematicBlurEnabled
          : DEFAULT_SETTINGS.cinematicBlurEnabled,
      cinematicBlurStyle:
        typeof source.cinematicBlurStyle === "string" &&
        ["scanline", "matrix", "noise"].includes(source.cinematicBlurStyle)
          ? source.cinematicBlurStyle
          : DEFAULT_SETTINGS.cinematicBlurStyle,
      bossKeyEnabled:
        typeof source.bossKeyEnabled === "boolean"
          ? source.bossKeyEnabled
          : DEFAULT_SETTINGS.bossKeyEnabled,
      bossKeyTheme:
        typeof source.bossKeyTheme === "string" &&
        ["spreadsheet", "vscode", "terminal"].includes(source.bossKeyTheme)
          ? source.bossKeyTheme
          : DEFAULT_SETTINGS.bossKeyTheme,
      readReceiptProtectionEnabled:
        typeof source.readReceiptProtectionEnabled === "boolean"
          ? source.readReceiptProtectionEnabled
          : DEFAULT_SETTINGS.readReceiptProtectionEnabled,
      dashboardEnabled:
        typeof source.dashboardEnabled === "boolean"
          ? source.dashboardEnabled
          : DEFAULT_SETTINGS.dashboardEnabled,
      morseNotificationsEnabled:
        typeof source.morseNotificationsEnabled === "boolean"
          ? source.morseNotificationsEnabled
          : DEFAULT_SETTINGS.morseNotificationsEnabled,
      morseContact:
        typeof source.morseContact === "string"
          ? source.morseContact
          : DEFAULT_SETTINGS.morseContact,
      fakeMeetingEnabled:
        typeof source.fakeMeetingEnabled === "boolean"
          ? source.fakeMeetingEnabled
          : DEFAULT_SETTINGS.fakeMeetingEnabled,
      fakeMeetingTemplate:
        typeof source.fakeMeetingTemplate === "string" &&
        ["calendar", "zoom", "outlook"].includes(source.fakeMeetingTemplate)
          ? source.fakeMeetingTemplate
          : DEFAULT_SETTINGS.fakeMeetingTemplate,
      danmuModeEnabled:
        typeof source.danmuModeEnabled === "boolean"
          ? source.danmuModeEnabled
          : DEFAULT_SETTINGS.danmuModeEnabled,
      danmuSpeed:
        typeof source.danmuSpeed === "string" &&
        ["slow", "normal", "fast"].includes(source.danmuSpeed)
          ? source.danmuSpeed
          : DEFAULT_SETTINGS.danmuSpeed,
      desktopPetEnabled:
        typeof source.desktopPetEnabled === "boolean"
          ? source.desktopPetEnabled
          : DEFAULT_SETTINGS.desktopPetEnabled,
      desktopPetTheme:
        typeof source.desktopPetTheme === "string" && source.desktopPetTheme === "pixel-cat"
          ? source.desktopPetTheme
          : DEFAULT_SETTINGS.desktopPetTheme,
      desktopPetMode:
        typeof source.desktopPetMode === "string" &&
        DESKTOP_PET_MODES.includes(source.desktopPetMode)
          ? source.desktopPetMode
          : DEFAULT_SETTINGS.desktopPetMode,
      desktopPetCorner:
        typeof source.desktopPetCorner === "string" &&
        DESKTOP_PET_CORNERS.includes(source.desktopPetCorner)
          ? source.desktopPetCorner
          : DEFAULT_SETTINGS.desktopPetCorner,
      desktopPetSize:
        typeof source.desktopPetSize === "string" &&
        DESKTOP_PET_SIZES.includes(source.desktopPetSize)
          ? source.desktopPetSize
          : DEFAULT_SETTINGS.desktopPetSize,
      desktopPetColor: normalizeHexColor(
        source.desktopPetColor,
        DEFAULT_SETTINGS.desktopPetColor
      ),
      desktopPetHidden:
        typeof source.desktopPetHidden === "boolean"
          ? source.desktopPetHidden
          : DEFAULT_SETTINGS.desktopPetHidden,
      popupExpandedSections: POPUP_SECTION_ORDER.reduce(function (accumulator, key) {
        const fallbackValue = DEFAULT_SETTINGS.popupExpandedSections[key];
        accumulator[key] =
          typeof sourcePopupExpandedSections[key] === "boolean"
            ? sourcePopupExpandedSections[key]
            : fallbackValue;
        return accumulator;
      }, {}),
      blurTargets: TARGET_ORDER.reduce(function (accumulator, key) {
        const fallbackValue = DEFAULT_SETTINGS.blurTargets[key];
        accumulator[key] =
          typeof sourceTargets[key] === "boolean" ? sourceTargets[key] : fallbackValue;
        return accumulator;
      }, {})
    };
  }

  function normalizeHexColor(value, fallback) {
    if (typeof value !== "string") {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
  }

  function normalizeAliasMap(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }

    return Object.keys(raw).reduce(function (accumulator, key) {
      const alias = raw[key];
      if (typeof alias !== "string") {
        return accumulator;
      }

      const trimmedKey = key.trim();
      const trimmedAlias = alias.trim();
      if (!trimmedKey || !trimmedAlias) {
        return accumulator;
      }

      accumulator[trimmedKey] = trimmedAlias;
      return accumulator;
    }, {});
  }

  function normalizePinnedContactGroups(raw) {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.reduce(function (accumulator, group) {
      if (!group || typeof group !== "object") {
        return accumulator;
      }

      const name = typeof group.name === "string" ? group.name.trim() : "";
      const contacts = Array.isArray(group.contacts)
        ? group.contacts
            .map(function (contact) {
              return typeof contact === "string" ? contact.trim() : "";
            })
            .filter(function (contact) {
              return contact.length > 0;
            })
        : [];

      if (!name || contacts.length === 0) {
        return accumulator;
      }

      accumulator.push({
        name: name,
        contacts: Array.from(new Set(contacts))
      });
      return accumulator;
    }, []);
  }

  function applyPreset(baseSettings, presetName) {
    const normalized = cloneSettings(baseSettings);
    const preset = PRESET_DEFINITIONS[presetName];

    if (!preset) {
      normalized.activePreset = "custom";
      return normalized;
    }

    if (typeof preset.hoverReveal === "boolean") {
      normalized.hoverReveal = preset.hoverReveal;
    }
    if (typeof preset.holdRevealEnabled === "boolean") {
      normalized.holdRevealEnabled = preset.holdRevealEnabled;
    }
    if (typeof preset.idleBlurEnabled === "boolean") {
      normalized.idleBlurEnabled = preset.idleBlurEnabled;
    }
    if (typeof preset.idleTimeoutMs === "number" && preset.idleTimeoutMs > 0) {
      normalized.idleTimeoutMs = preset.idleTimeoutMs;
    }
    if (typeof preset.bookmarkBarEnabled === "boolean") {
      normalized.bookmarkBarEnabled = preset.bookmarkBarEnabled;
    }
    if (typeof preset.bookmarkBarTheme === "string") {
      normalized.bookmarkBarTheme = preset.bookmarkBarTheme;
    }
    if (preset.blurTargets) {
      normalized.blurTargets = TARGET_ORDER.reduce(function (accumulator, key) {
        const hasOverride = Object.prototype.hasOwnProperty.call(preset.blurTargets, key);
        accumulator[key] = hasOverride
          ? !!preset.blurTargets[key]
          : normalized.blurTargets[key];
        return accumulator;
      }, {});
    }

    normalized.activePreset = presetName;
    return normalized;
  }

  return {
    STORAGE_KEY,
    TARGET_ORDER,
    PRESET_ORDER,
    PRESET_DEFINITIONS,
    BOOKMARK_BAR_THEMES,
    LANGUAGE_ORDER,
    POPUP_SECTION_ORDER,
    DESKTOP_PET_MODES,
    DESKTOP_PET_CORNERS,
    DESKTOP_PET_SIZES,
    DEFAULT_SETTINGS,
    cloneSettings,
    mergeSettings,
    applyPreset
  };
});
