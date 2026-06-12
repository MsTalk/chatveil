(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurSelectors = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const BLUR_CLASS = "wa-blur-ext--blurred";
  const CINEMATIC_CLASS_PREFIX = "wa-blur-ext--cinematic-";
  const CINEMATIC_STYLES = Object.freeze(["scanline", "matrix", "noise"]);
  const HOVER_ENABLED_CLASS = "wa-blur-ext--hover-enabled";
  const TEMP_REVEAL_CLASS = "wa-blur-ext--temp-reveal";
  const HOLD_REVEAL_CLASS = "wa-blur-ext--hold-reveal";
  const IDLE_BLUR_CLASS = "wa-blur-ext--idle-blur";
  const MANAGED_ATTRIBUTE = "data-wa-blur-managed";
  const TARGET_ATTRIBUTE = "data-wa-blur-target";

  const COMPOSER_EXCLUDE_SELECTORS = Object.freeze([
    "footer",
    '[contenteditable="true"][role="textbox"]',
    '[data-testid="conversation-compose-box-input"]',
    '[data-testid="compose-box-input"]'
  ]);
  const OVERLAY_EXCLUDE_SELECTORS = Object.freeze([
    "#wa-bookmark-bar",
    ".wa-bookmark-bar",
    ".wa-bookmark-bar__panel",
    "#wa-desktop-pet-root",
    ".wa-desktop-pet-root"
  ]);

  const TARGET_META = Object.freeze({
    contactList: Object.freeze({
      label: "Contact list",
      selectors: Object.freeze([
        '#pane-side [data-testid="cell-frame-title"]',
        '#pane-side [data-testid="cell-frame-title"] span[dir="auto"]'
      ])
    }),
    chatText: Object.freeze({
      label: "Chat message text",
      closestSelector: "div.copyable-text",
      selectors: Object.freeze([
        '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] span.selectable-text',
        '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] div.selectable-text',
        '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] div.copyable-text span[dir="ltr"]',
        '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] [data-testid="author"]',
        '#main [data-testid="conversation-panel-body"] [data-testid="msg-container"] span:has(> img.emoji)'
      ])
    }),
    avatars: Object.freeze({
      label: "Avatars",
      selectors: Object.freeze([
        "#pane-side img",
        '#pane-side span[data-testid="default-contact-refreshed"]',
        '#pane-side span[data-testid="default-group-refreshed"]',
        "#main header img",
        'div[data-testid="navbar-item-profile-photo"] img',
        'div:has(> div > [data-testid="profile-first-initial"])',
        '#main .focusable-list-item img',
        '[data-testid="group-chat-profile-picture"] img'
      ])
    }),
    previewText: Object.freeze({
      label: "Preview text",
      selectors: Object.freeze([
        '#pane-side [data-testid="cell-frame-secondary"] span[dir="auto"]',
        '#pane-side [data-testid="cell-frame-secondary"] span[dir="ltr"]',
        '#pane-side [data-testid="cell-frame-secondary"] div[dir="auto"]',
        '#pane-side [data-testid="last-msg-status"] span',
        '#pane-side [data-testid="cell-frame-primary-detail"] span'
      ])
    }),
    mediaPreviews: Object.freeze({
      label: "Media previews and documents",
      selectors: Object.freeze([
        '#main [data-testid="msg-container"] img',
        '#main [data-testid="msg-container"] video',
        '#main [data-testid="msg-container"] canvas',
        '#main [data-testid="msg-container"] div[role="button"][tabindex="0"]:has(span[data-icon*="document"])'
      ])
    }),
    voiceMessages: Object.freeze({
      label: "Voice message cards",
      closestSelector: '[data-testid="msg-container"]',
      selectors: Object.freeze([
        '#main [data-testid="msg-container"] [data-testid*="audio"]',
        '#main [data-testid="msg-container"] [data-testid="ptt-status-icon"]',
        '#main [data-testid="msg-container"] [role="slider"]'
      ])
    }),
    timestamps: Object.freeze({
      label: "Timestamps & read receipts",
      selectors: Object.freeze([
        '#main [data-testid="msg-container"] [data-testid="msg-meta"]'
      ])
    }),
    otherUi: Object.freeze({
      label: "Other WhatsApp Web UI",
      selectors: Object.freeze([
        "#side header",
        "#main header",
        '#side [data-testid="chat-list-search"]'
      ])
    })
  });

  const TARGET_KEYS = Object.freeze(Object.keys(TARGET_META));

  return {
    BLUR_CLASS,
    CINEMATIC_CLASS_PREFIX,
    CINEMATIC_STYLES,
    HOVER_ENABLED_CLASS,
    TEMP_REVEAL_CLASS,
    HOLD_REVEAL_CLASS,
    IDLE_BLUR_CLASS,
    MANAGED_ATTRIBUTE,
    TARGET_ATTRIBUTE,
    COMPOSER_EXCLUDE_SELECTORS,
    OVERLAY_EXCLUDE_SELECTORS,
    TARGET_META,
    TARGET_KEYS
  };
});
