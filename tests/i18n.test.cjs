const test = require("node:test");
const assert = require("node:assert/strict");

const i18n = require("../src/shared/i18n.js");

test("i18n exposes popup language options in selector order", () => {
  assert.deepEqual(i18n.LANGUAGE_ORDER, ["en", "zh-Hant", "zh-Hans"]);
  assert.equal(i18n.LANGUAGE_META.en.label, "English");
  assert.equal(i18n.LANGUAGE_META["zh-Hant"].label, "繁體中文");
  assert.equal(i18n.LANGUAGE_META["zh-Hans"].label, "简体中文");
});

test("i18n translates popup labels and interpolates replacement values", () => {
  assert.equal(i18n.getMessage("zh-Hant", "language.label"), "語言");
  assert.equal(
    i18n.getMessage("zh-Hans", "action.showAllForSeconds", { seconds: 5 }),
    "显示全部 5 秒"
  );
});

test("i18n falls back to English for unsupported languages and missing keys", () => {
  assert.equal(i18n.normalizeLanguage("fr"), "en");
  assert.equal(i18n.getMessage("fr", "language.label"), "Language");
  assert.equal(i18n.getMessage("zh-Hant", "missing.key"), "missing.key");
});
