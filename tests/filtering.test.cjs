const test = require("node:test");
const assert = require("node:assert/strict");

const filtering = require("../src/content/filtering.js");

test("shouldSkipBlurNode rejects null and missing closest", () => {
  assert.equal(filtering.shouldSkipBlurNode(null, []), true);
  assert.equal(filtering.shouldSkipBlurNode({}, []), true);
});

test("shouldSkipBlurNode rejects invalid exclude selector collections", () => {
  const node = {
    closest() {
      return null;
    }
  };

  assert.equal(filtering.shouldSkipBlurNode(node, null), false);
  assert.equal(filtering.shouldSkipBlurNode(node, "footer"), false);
});

test("shouldSkipBlurNode rejects elements inside excluded composer selectors", () => {
  const node = {
    closest(selector) {
      return selector === '[contenteditable="true"][role="textbox"]' ? {} : null;
    }
  };

  assert.equal(
    filtering.shouldSkipBlurNode(node, ['[contenteditable="true"][role="textbox"]']),
    true
  );
});

test("shouldSkipBlurNode allows valid non-composer elements", () => {
  const node = {
    closest() {
      return null;
    }
  };

  assert.equal(filtering.shouldSkipBlurNode(node, ["footer"]), false);
});
