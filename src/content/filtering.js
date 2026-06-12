(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurFiltering = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function shouldSkipBlurNode(node, excludeSelectors) {
    if (!node || typeof node.closest !== "function") {
      return true;
    }

    const selectors = Array.isArray(excludeSelectors) ? excludeSelectors : [];

    return selectors.some(function (selector) {
      return Boolean(node.closest(selector));
    });
  }

  return {
    shouldSkipBlurNode
  };
});
