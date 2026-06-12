const test = require("node:test");
const assert = require("node:assert/strict");

const runtime = require("../src/shared/runtime.js");
const settings = require("../src/shared/settings.js");
const selectors = require("../src/content/selectors.js");

test("message types stay stable across popup and content script", () => {
  assert.deepEqual(runtime.MESSAGE_TYPES, {
    applySettings: "WHATSAPP_BLUR_APPLY_SETTINGS",
    showAllTemporarily: "WHATSAPP_BLUR_SHOW_ALL_TEMPORARILY",
    hideAllTemporarily: "WHATSAPP_BLUR_HIDE_ALL_TEMPORARILY",
    bossKeyToggle: "WHATSAPP_BLUR_BOSS_KEY_TOGGLE",
    morseNotify: "WHATSAPP_BLUR_MORSE_NOTIFY",
    fakeMeetingGenerate: "WHATSAPP_BLUR_FAKE_MEETING_GENERATE",
    requestRefresh: "WHATSAPP_BLUR_REQUEST_REFRESH",
    desktopPetPreview: "WHATSAPP_BLUR_DESKTOP_PET_PREVIEW"
  });
});

test("temporary reveal helpers compute and clear deadlines", () => {
  const deadline = runtime.computeTempRevealUntil(1000, 5000);
  const started = runtime.reduceRuntimeState(runtime.createRuntimeState(), {
    type: "reveal/started",
    until: deadline
  });
  const cleared = runtime.reduceRuntimeState(started, {
    type: "reveal/cleared"
  });

  assert.equal(deadline, 6000);
  assert.equal(runtime.isTempRevealActive(started, 5999), true);
  assert.equal(runtime.isTempRevealActive(started, 6000), false);
  assert.equal(cleared.tempRevealUntil, 0);
});

test("every target has a non-empty selector list", () => {
  for (const key of selectors.TARGET_KEYS) {
    assert.ok(selectors.TARGET_META[key]);
    assert.ok(selectors.TARGET_META[key].label.length > 0);
    assert.ok(selectors.TARGET_META[key].selectors.length > 0);
  }
});

test("selector target keys stay aligned with settings target order", () => {
  assert.deepEqual(selectors.TARGET_KEYS, settings.TARGET_ORDER);

  for (const key of settings.TARGET_ORDER) {
    assert.ok(selectors.TARGET_META[key]);
  }
});

test("composer exclusion selectors include the editable textbox", () => {
  assert.equal(
    selectors.COMPOSER_EXCLUDE_SELECTORS.includes('[contenteditable="true"][role="textbox"]'),
    true
  );
});

test("overlay exclusion selectors include desktop pet and bookmark bar roots", () => {
  assert.equal(
    selectors.OVERLAY_EXCLUDE_SELECTORS.includes("#wa-bookmark-bar"),
    true
  );
  assert.equal(
    selectors.OVERLAY_EXCLUDE_SELECTORS.includes(".wa-bookmark-bar"),
    true
  );
  assert.equal(
    selectors.OVERLAY_EXCLUDE_SELECTORS.includes(".wa-bookmark-bar__panel"),
    true
  );
  assert.equal(
    selectors.OVERLAY_EXCLUDE_SELECTORS.includes("#wa-desktop-pet-root"),
    true
  );
  assert.equal(
    selectors.OVERLAY_EXCLUDE_SELECTORS.includes(".wa-desktop-pet-root"),
    true
  );
});

test("contact list selectors stay narrower than the whole sidebar container", () => {
  assert.equal(selectors.TARGET_META.contactList.selectors.includes("#pane-side"), false);
});

test("contact list selectors stay scoped to title text, not row containers or preview content", () => {
  const contactListSelectors = selectors.TARGET_META.contactList.selectors;

  assert.equal(contactListSelectors.includes('#pane-side [data-testid="cell-frame-container"]'), false);
  assert.equal(contactListSelectors.includes('[aria-label="Chat list"] [role="listitem"]'), false);

  assert.equal(
    contactListSelectors.some((selector) => selector.includes("cell-frame-secondary")),
    false
  );
  assert.equal(contactListSelectors.some((selector) => selector.includes("img")), false);
  assert.equal(
    contactListSelectors.some((selector) => selector.includes("cell-frame-title")),
    true
  );
});

test("avatars and media previews do not share message image selectors", () => {
  const avatarSelectors = selectors.TARGET_META.avatars.selectors;
  const mediaSelectors = selectors.TARGET_META.mediaPreviews.selectors;

  assert.equal(avatarSelectors.includes('#main [data-testid="msg-container"] img'), false);
  assert.equal(mediaSelectors.includes('#main [data-testid="msg-container"] img'), true);
  assert.equal(
    mediaSelectors.includes(
      '#main [data-testid="msg-container"] div[role="button"][tabindex="0"]:has(span[data-icon*="document"])'
    ),
    true
  );
});

test("voice message selectors promote matches to the message card container", () => {
  assert.equal(
    selectors.TARGET_META.voiceMessages.closestSelector,
    '[data-testid="msg-container"]'
  );
});

test("selector exports are frozen", () => {
  assert.equal(Object.isFrozen(selectors.TARGET_KEYS), true);
  assert.equal(Object.isFrozen(selectors.TARGET_META), true);
  assert.equal(selectors.HOLD_REVEAL_CLASS, "wa-blur-ext--hold-reveal");
  assert.equal(Object.isFrozen(selectors.OVERLAY_EXCLUDE_SELECTORS), true);

  for (const key of selectors.TARGET_KEYS) {
    assert.equal(Object.isFrozen(selectors.TARGET_META[key]), true);
    assert.equal(Object.isFrozen(selectors.TARGET_META[key].selectors), true);
  }
});
