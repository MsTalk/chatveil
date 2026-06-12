const test = require("node:test");
const assert = require("node:assert/strict");

const settings = require("../src/shared/settings.js");

test("mergeSettings returns all default flags when storage is empty", () => {
  const merged = settings.mergeSettings();

  assert.equal(merged.enabled, true);
  assert.equal(merged.hoverReveal, true);
  assert.equal(merged.holdRevealEnabled, false);
  assert.equal(merged.idleBlurEnabled, false);
  assert.equal(merged.idleTimeoutMs, 30000);
  assert.equal(merged.temporaryRevealSeconds, 5);
  assert.equal(merged.language, "en");
  assert.equal(merged.activePreset, "custom");
  assert.equal(merged.bookmarkBarTheme, "classic");
  assert.equal(merged.bookmarkBarColor, "#f1f3f4");
  assert.equal(merged.cinematicBlurEnabled, false);
  assert.equal(merged.cinematicBlurStyle, "scanline");
  assert.equal(merged.bossKeyEnabled, false);
  assert.equal(merged.bossKeyTheme, "spreadsheet");
  assert.equal(merged.readReceiptProtectionEnabled, false);
  assert.equal(merged.dashboardEnabled, false);
  assert.equal(merged.morseNotificationsEnabled, false);
  assert.equal(merged.morseContact, "");
  assert.equal(merged.fakeMeetingEnabled, false);
  assert.equal(merged.fakeMeetingTemplate, "calendar");
  assert.equal(merged.danmuModeEnabled, false);
  assert.equal(merged.danmuSpeed, "normal");
  assert.equal(merged.desktopPetEnabled, false);
  assert.equal(merged.desktopPetTheme, "pixel-cat");
  assert.equal(merged.desktopPetMode, "hybrid");
  assert.equal(merged.desktopPetCorner, "bottom-right");
  assert.equal(merged.desktopPetSize, "medium");
  assert.equal(merged.desktopPetColor, "#ffd782");
  assert.equal(merged.desktopPetHidden, false);
  assert.deepEqual(merged.popupExpandedSections, {
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
  });
  assert.deepEqual(merged.contactAliases, {});
  assert.deepEqual(merged.pinnedContactGroups, []);
  assert.deepEqual(merged.blurTargets, {
    contactList: true,
    chatText: true,
    avatars: true,
    previewText: true,
    mediaPreviews: true,
    voiceMessages: true,
    timestamps: false,
    otherUi: false
  });
});

test("mergeSettings preserves supported popup languages and rejects unknown languages", () => {
  const traditional = settings.mergeSettings({ language: "zh-Hant" });
  const simplified = settings.mergeSettings({ language: "zh-Hans" });
  const invalid = settings.mergeSettings({ language: "fr" });

  assert.equal(traditional.language, "zh-Hant");
  assert.equal(simplified.language, "zh-Hans");
  assert.equal(invalid.language, "en");
});

test("mergeSettings preserves known flags and drops unknown ones", () => {
  const merged = settings.mergeSettings({
    enabled: false,
    hoverReveal: false,
    holdRevealEnabled: true,
    activePreset: "private",
    bookmarkBarTheme: "midnight",
    popupExpandedSections: {
      bookmarkBar: false,
      privacyBlur: true,
      fakeSection: true
    },
    blurTargets: {
      contactList: false,
      chatText: true,
      fakeTarget: true
    },
    contactAliases: {
      " Alice ": " Client A "
    },
    pinnedContactGroups: [
      { name: " Work ", contacts: [" Alice ", "Bob", "Bob"] },
      { name: "", contacts: ["Nobody"] }
    ]
  });

  assert.equal(merged.enabled, false);
  assert.equal(merged.hoverReveal, false);
  assert.equal(merged.holdRevealEnabled, true);
  assert.equal(merged.idleBlurEnabled, false);
  assert.equal(merged.idleTimeoutMs, 30000);
  assert.equal(merged.temporaryRevealSeconds, 5);
  assert.equal(merged.activePreset, "private");
  assert.equal(merged.bookmarkBarTheme, "midnight");
  assert.equal(merged.cinematicBlurEnabled, false);
  assert.equal(merged.bossKeyEnabled, false);
  assert.equal(merged.readReceiptProtectionEnabled, false);
  assert.equal(merged.danmuModeEnabled, false);
  assert.deepEqual(merged.popupExpandedSections, {
    bookmarkBar: false,
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
  });
  assert.equal(merged.blurTargets.contactList, false);
  assert.equal(merged.blurTargets.chatText, true);
  assert.equal(Object.hasOwn(merged.blurTargets, "fakeTarget"), false);
  assert.deepEqual(merged.contactAliases, {
    Alice: "Client A"
  });
  assert.deepEqual(merged.pinnedContactGroups, [
    { name: "Work", contacts: ["Alice", "Bob"] }
  ]);
});

test("mergeSettings normalizes and backfills desktop pet defaults", () => {
  const merged = settings.mergeSettings({});

  assert.equal(merged.desktopPetEnabled, false);
  assert.equal(merged.desktopPetTheme, "pixel-cat");
  assert.equal(merged.desktopPetMode, "hybrid");
  assert.equal(merged.desktopPetCorner, "bottom-right");
  assert.equal(merged.desktopPetSize, "medium");
  assert.equal(merged.desktopPetColor, "#ffd782");
  assert.equal(merged.desktopPetHidden, false);
});

test("mergeSettings rejects invalid desktop pet options and reverts to defaults", () => {
  const merged = settings.mergeSettings({
    desktopPetEnabled: "yes",
    desktopPetTheme: "neon-cat",
    desktopPetMode: "all-the-way",
    desktopPetCorner: "center",
    desktopPetSize: "colossal",
    desktopPetColor: "orange",
    desktopPetHidden: "no"
  });

  assert.equal(merged.desktopPetEnabled, false);
  assert.equal(merged.desktopPetTheme, "pixel-cat");
  assert.equal(merged.desktopPetMode, "hybrid");
  assert.equal(merged.desktopPetCorner, "bottom-right");
  assert.equal(merged.desktopPetSize, "medium");
  assert.equal(merged.desktopPetColor, "#ffd782");
  assert.equal(merged.desktopPetHidden, false);
});

test("mergeSettings normalizes desktop pet color hex values", () => {
  const merged = settings.mergeSettings({
    desktopPetColor: "#6EC6FF"
  });

  assert.equal(merged.desktopPetColor, "#6ec6ff");
});

test("cloneSettings returns a deep copy", () => {
  const source = settings.mergeSettings();
  const cloned = settings.cloneSettings(source);

  cloned.blurTargets.contactList = false;

  assert.equal(source.blurTargets.contactList, true);
});

test("cloneSettings normalizes partial settings before cloning", () => {
  const source = {
    enabled: false,
    blurTargets: {
      chatText: false
    }
  };

  const cloned = settings.cloneSettings(source);

  assert.equal(cloned.enabled, false);
  assert.equal(cloned.hoverReveal, true);
  assert.equal(cloned.holdRevealEnabled, false);
  assert.equal(cloned.idleBlurEnabled, false);
  assert.equal(cloned.idleTimeoutMs, 30000);
  assert.equal(cloned.temporaryRevealSeconds, 5);
  assert.deepEqual(cloned.blurTargets, {
    contactList: true,
    chatText: false,
    avatars: true,
    previewText: true,
    mediaPreviews: true,
    voiceMessages: true,
    timestamps: false,
    otherUi: false
  });
});

test("applyPreset overlays the expected preset values", () => {
  const base = settings.mergeSettings({
    hoverReveal: true,
    idleBlurEnabled: false,
    bookmarkBarTheme: "classic"
  });

  const applied = settings.applyPreset(base, "private");

  assert.notEqual(applied, base);
  assert.equal(applied.activePreset, "private");
  assert.equal(applied.hoverReveal, false);
  assert.equal(applied.holdRevealEnabled, false);
  assert.equal(applied.idleBlurEnabled, true);
  assert.equal(applied.bookmarkBarTheme, "midnight");
  assert.equal(applied.blurTargets.otherUi, true);
  assert.equal(applied.blurTargets.timestamps, true);
});

test("applyPreset leaves unknown preset names in custom mode", () => {
  const applied = settings.applyPreset(settings.mergeSettings(), "not-a-preset");

  assert.equal(applied.activePreset, "custom");
  assert.equal(applied.enabled, true);
});

test("applyPreset leaves desktop pet preferences untouched", () => {
  const base = settings.mergeSettings({
    desktopPetEnabled: true,
    desktopPetTheme: "pixel-cat",
    desktopPetMode: "interactive",
    desktopPetCorner: "top-left",
    desktopPetSize: "large",
    desktopPetColor: "#6ec6ff",
    desktopPetHidden: true
  });

  const applied = settings.applyPreset(base, "private");

  assert.equal(applied.desktopPetEnabled, true);
  assert.equal(applied.desktopPetTheme, "pixel-cat");
  assert.equal(applied.desktopPetMode, "interactive");
  assert.equal(applied.desktopPetCorner, "top-left");
  assert.equal(applied.desktopPetSize, "large");
  assert.equal(applied.desktopPetColor, "#6ec6ff");
  assert.equal(applied.desktopPetHidden, true);
});
