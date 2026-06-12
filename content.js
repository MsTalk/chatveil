(function () {
  const settingsApi = globalThis.WhatsAppBlurSettings;
  const runtimeApi = globalThis.WhatsAppBlurRuntime;
  const selectorsApi = globalThis.WhatsAppBlurSelectors;
  const filteringApi = globalThis.WhatsAppBlurFiltering;

  const rootElement = document.documentElement;
  let runtimeState = runtimeApi.createRuntimeState();
  let activeSettings = settingsApi.mergeSettings();
  let observer = null;
  let revealTimerId = null;
  let emergencyHideTimerId = null;
  let installObserverRetryTimerId = null;
  let scheduledApplyTimerId = null;
  let idleBlurTimerId = null;
  let idleBlurListenersInstalled = false;
  let holdRevealListenersInstalled = false;
  let holdRevealActive = false;

  initialize();

  async function initialize() {
    activeSettings = await readStoredSettings();
    applySettings(activeSettings);
    installObserver();
    chrome.runtime.onMessage.addListener(function (message) {
      if (!message || !message.type) {
        return;
      }

      if (message.type === runtimeApi.MESSAGE_TYPES.applySettings) {
        activeSettings = settingsApi.mergeSettings(message.settings);
        applySettings(activeSettings);
        return;
      }

      if (message.type === runtimeApi.MESSAGE_TYPES.showAllTemporarily) {
        startTemporaryReveal(message.durationMs || 5000);
        return;
      }

      if (message.type === runtimeApi.MESSAGE_TYPES.hideAllTemporarily) {
        startTemporaryHide(message.durationMs || 5000);
        return;
      }

      if (message.type === runtimeApi.MESSAGE_TYPES.bossKeyToggle) {
        if (
          activeSettings.bossKeyEnabled &&
          typeof globalThis.WhatsAppBlurBossKey !== "undefined"
        ) {
          globalThis.WhatsAppBlurBossKey.toggle(activeSettings.bossKeyTheme || "spreadsheet");
        }
        return;
      }

      if (message.type === runtimeApi.MESSAGE_TYPES.fakeMeetingGenerate) {
        if (
          activeSettings.fakeMeetingEnabled &&
          typeof globalThis.WhatsAppBlurFakeMeeting !== "undefined"
        ) {
          globalThis.WhatsAppBlurFakeMeeting.generateMeeting(
            activeSettings.fakeMeetingTemplate || "calendar"
          );
        }
        return;
      }
    });
  }

  async function readStoredSettings() {
    try {
      const result = await chrome.storage.local.get(settingsApi.STORAGE_KEY);
      return settingsApi.mergeSettings(result[settingsApi.STORAGE_KEY]);
    } catch (error) {
      return settingsApi.mergeSettings();
    }
  }

  function installObserver() {
    if (!document.body) {
      if (!installObserverRetryTimerId) {
        installObserverRetryTimerId = window.setTimeout(function () {
          installObserverRetryTimerId = null;
          installObserver();
        }, 50);
      }
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(function () {
      if (!runtimeApi.isTempRevealActive(runtimeState, Date.now())) {
        scheduleApplySettings();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function scheduleApplySettings() {
    if (scheduledApplyTimerId) {
      return;
    }

    scheduledApplyTimerId = window.setTimeout(function () {
      scheduledApplyTimerId = null;
      applySettings(activeSettings);
    }, 0);
  }

  function applySettings(settings) {
    const resolvedSettings = getEffectiveSettings(settings);

    clearManagedBlur();

    rootElement.classList.toggle(selectorsApi.HOVER_ENABLED_CLASS, resolvedSettings.hoverReveal);
    rootElement.classList.toggle(
      selectorsApi.TEMP_REVEAL_CLASS,
      runtimeApi.isTempRevealActive(runtimeState, Date.now())
    );
    rootElement.classList.toggle(
      selectorsApi.HOLD_REVEAL_CLASS,
      resolvedSettings.holdRevealEnabled &&
        holdRevealActive &&
        !runtimeApi.isEmergencyHideActive(runtimeState, Date.now())
    );

    if (resolvedSettings.idleBlurEnabled) {
      installIdleBlurListeners();
      resetIdleTimer();
    } else {
      uninstallIdleBlurListeners();
      removeIdleBlur();
      if (idleBlurTimerId) {
        window.clearTimeout(idleBlurTimerId);
        idleBlurTimerId = null;
      }
    }

    if (resolvedSettings.holdRevealEnabled) {
      installHoldRevealListeners();
    } else {
      uninstallHoldRevealListeners();
    }

    closeDisabledFeatureOverlays(resolvedSettings);

    if (resolvedSettings.readReceiptProtectionEnabled) {
      rootElement.classList.add("wa-blur-ext--read-receipt-protection");
    } else {
      rootElement.classList.remove("wa-blur-ext--read-receipt-protection");
    }

    if (!resolvedSettings.enabled) {
      return;
    }

    const managedNodes = [];
    const seenNodes = new Set();

    collectBlurCandidates(resolvedSettings)
      .sort(function (left, right) {
        return right.depth - left.depth || left.order - right.order;
      })
      .forEach(function (candidate) {
        if (
          seenNodes.has(candidate.node) ||
          hasManagedDescendant(candidate.node, managedNodes, candidate.targetKey)
        ) {
          return;
        }

        seenNodes.add(candidate.node);
        managedNodes.push(candidate.node);
        candidate.node.setAttribute(selectorsApi.MANAGED_ATTRIBUTE, "true");
        candidate.node.setAttribute(selectorsApi.TARGET_ATTRIBUTE, candidate.targetKey);
        candidate.node.classList.add(selectorsApi.BLUR_CLASS);

        if (resolvedSettings.cinematicBlurEnabled) {
          const styleClass = selectorsApi.CINEMATIC_CLASS_PREFIX + resolvedSettings.cinematicBlurStyle;
          if (selectorsApi.CINEMATIC_STYLES.includes(resolvedSettings.cinematicBlurStyle)) {
            candidate.node.classList.add(styleClass);
          }
        }
      });
  }

  function clearManagedBlur() {
    document
      .querySelectorAll("[" + selectorsApi.MANAGED_ATTRIBUTE + '="true"]')
      .forEach(function (node) {
        node.removeAttribute(selectorsApi.MANAGED_ATTRIBUTE);
        node.removeAttribute(selectorsApi.TARGET_ATTRIBUTE);
        node.classList.remove(selectorsApi.BLUR_CLASS);
        selectorsApi.CINEMATIC_STYLES.forEach(function (style) {
          node.classList.remove(selectorsApi.CINEMATIC_CLASS_PREFIX + style);
        });
      });
  }

  function collectBlurCandidates(settings) {
    const candidates = [];
    const overlayExcludeSelectors = Array.isArray(selectorsApi.OVERLAY_EXCLUDE_SELECTORS) &&
      selectorsApi.OVERLAY_EXCLUDE_SELECTORS.length
      ? selectorsApi.OVERLAY_EXCLUDE_SELECTORS
      : [
          "#wa-bookmark-bar",
          ".wa-bookmark-bar",
          ".wa-bookmark-bar__panel",
          "#wa-desktop-pet-root",
          ".wa-desktop-pet-root"
        ];

    settingsApi.TARGET_ORDER.forEach(function (targetKey) {
      if (!settings.blurTargets[targetKey]) {
        return;
      }

      selectorsApi.TARGET_META[targetKey].selectors.forEach(function (selector) {
        document.querySelectorAll(selector).forEach(function (node) {
          const normalizedNode = normalizeTargetNode(node, targetKey);

          if (
            filteringApi.shouldSkipBlurNode(
              normalizedNode,
              selectorsApi.COMPOSER_EXCLUDE_SELECTORS
            )
          ) {
            return;
          }

          if (
            filteringApi.shouldSkipBlurNode(
              normalizedNode,
              overlayExcludeSelectors
            )
          ) {
            return;
          }

          candidates.push({
            node: normalizedNode,
            targetKey: targetKey,
            depth: getNodeDepth(normalizedNode),
            order: candidates.length
          });
        });
      });
    });

    return candidates;
  }

  function normalizeTargetNode(node, targetKey) {
    const targetMeta = selectorsApi.TARGET_META[targetKey];

    if (!node || typeof node.closest !== "function") {
      return null;
    }

    if (!targetMeta.closestSelector) {
      return node;
    }

    return node.closest(targetMeta.closestSelector) || node;
  }

  function getNodeDepth(node) {
    let depth = 0;
    let currentNode = node;

    while (currentNode && currentNode.parentElement) {
      depth += 1;
      currentNode = currentNode.parentElement;
    }

    return depth;
  }

  function hasManagedDescendant(node, managedNodes, targetKey) {
    return managedNodes.some(function (managedNode) {
      return (
        managedNode !== node &&
        node.contains(managedNode) &&
        managedNode.getAttribute(selectorsApi.TARGET_ATTRIBUTE) === targetKey
      );
    });
  }

  function startTemporaryReveal(durationMs) {
    if (revealTimerId) {
      window.clearTimeout(revealTimerId);
    }

    runtimeState = runtimeApi.reduceRuntimeState(runtimeState, {
      type: "reveal/started",
      until: runtimeApi.computeTempRevealUntil(Date.now(), durationMs)
    });

    rootElement.classList.add(selectorsApi.TEMP_REVEAL_CLASS);

    revealTimerId = window.setTimeout(function () {
      runtimeState = runtimeApi.reduceRuntimeState(runtimeState, {
        type: "reveal/cleared"
      });
      rootElement.classList.remove(selectorsApi.TEMP_REVEAL_CLASS);
      applySettings(activeSettings);
    }, durationMs);
  }

  function startTemporaryHide(durationMs) {
    if (emergencyHideTimerId) {
      window.clearTimeout(emergencyHideTimerId);
    }

    runtimeState = runtimeApi.reduceRuntimeState(runtimeState, {
      type: "hide/started",
      until: runtimeApi.computeEmergencyHideUntil(Date.now(), durationMs)
    });

    holdRevealActive = false;
    rootElement.classList.remove(selectorsApi.HOLD_REVEAL_CLASS);
    applySettings(activeSettings);

    emergencyHideTimerId = window.setTimeout(function () {
      runtimeState = runtimeApi.reduceRuntimeState(runtimeState, {
        type: "hide/cleared"
      });
      emergencyHideTimerId = null;
      applySettings(activeSettings);
    }, durationMs);
  }

  function installIdleBlurListeners() {
    if (idleBlurListenersInstalled) {
      return;
    }

    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("mousemove", onUserActivity);
    document.addEventListener("mousedown", onUserActivity);
    document.addEventListener("keydown", onUserActivity);
    document.addEventListener("scroll", onUserActivity);
    document.addEventListener("touchstart", onUserActivity);

    idleBlurListenersInstalled = true;
  }

  function installHoldRevealListeners() {
    if (holdRevealListenersInstalled) {
      return;
    }

    document.addEventListener("keydown", onHoldRevealKeyDown);
    document.addEventListener("keyup", onHoldRevealKeyUp);
    window.addEventListener("blur", onHoldRevealWindowBlur);
    holdRevealListenersInstalled = true;
  }

  function uninstallHoldRevealListeners() {
    if (!holdRevealListenersInstalled) {
      return;
    }

    document.removeEventListener("keydown", onHoldRevealKeyDown);
    document.removeEventListener("keyup", onHoldRevealKeyUp);
    window.removeEventListener("blur", onHoldRevealWindowBlur);
    holdRevealListenersInstalled = false;
    setHoldRevealActive(false);
  }

  function uninstallIdleBlurListeners() {
    if (!idleBlurListenersInstalled) {
      return;
    }

    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("focus", onWindowFocus);
    document.removeEventListener("mousemove", onUserActivity);
    document.removeEventListener("mousedown", onUserActivity);
    document.removeEventListener("keydown", onUserActivity);
    document.removeEventListener("scroll", onUserActivity);
    document.removeEventListener("touchstart", onUserActivity);

    idleBlurListenersInstalled = false;
  }

  function onWindowBlur() {
    if (activeSettings.idleBlurEnabled) {
      applyIdleBlur();
    }
  }

  function onWindowFocus() {
    if (activeSettings.idleBlurEnabled) {
      removeIdleBlur();
      resetIdleTimer();
    }
  }

  function onUserActivity() {
    if (activeSettings.idleBlurEnabled) {
      removeIdleBlur();
      resetIdleTimer();
    }
  }

  function onHoldRevealKeyDown(event) {
    if (!activeSettings.holdRevealEnabled || runtimeApi.isEmergencyHideActive(runtimeState, Date.now())) {
      return;
    }

    if (event.key !== "Alt") {
      return;
    }

    setHoldRevealActive(true);
  }

  function onHoldRevealKeyUp(event) {
    if (event.key !== "Alt") {
      return;
    }

    setHoldRevealActive(false);
  }

  function onHoldRevealWindowBlur() {
    setHoldRevealActive(false);
  }

  function setHoldRevealActive(active) {
    holdRevealActive = !!active;
    rootElement.classList.toggle(
      selectorsApi.HOLD_REVEAL_CLASS,
      holdRevealActive &&
        activeSettings.holdRevealEnabled &&
        !runtimeApi.isEmergencyHideActive(runtimeState, Date.now())
    );
  }

  function resetIdleTimer() {
    if (idleBlurTimerId) {
      window.clearTimeout(idleBlurTimerId);
    }

    var timeoutMs = activeSettings.idleTimeoutMs || 30000;

    idleBlurTimerId = window.setTimeout(function () {
      if (activeSettings.idleBlurEnabled) {
        applyIdleBlur();
      }
    }, timeoutMs);
  }

  function applyIdleBlur() {
    rootElement.classList.add(selectorsApi.IDLE_BLUR_CLASS);
  }

  function removeIdleBlur() {
    rootElement.classList.remove(selectorsApi.IDLE_BLUR_CLASS);
  }

  function closeDisabledFeatureOverlays(settings) {
    const bossKeyApi = globalThis.WhatsAppBlurBossKey;
    if (
      !settings.bossKeyEnabled &&
      bossKeyApi &&
      typeof bossKeyApi.getActive === "function" &&
      bossKeyApi.getActive() &&
      typeof bossKeyApi.hide === "function"
    ) {
      bossKeyApi.hide();
    }

    const fakeMeetingApi = globalThis.WhatsAppBlurFakeMeeting;
    if (
      !settings.fakeMeetingEnabled &&
      fakeMeetingApi &&
      typeof fakeMeetingApi.closeMeeting === "function"
    ) {
      fakeMeetingApi.closeMeeting();
    }
  }

  function getEffectiveSettings(settings) {
    if (!runtimeApi.isEmergencyHideActive(runtimeState, Date.now())) {
      return settings;
    }

    const blurTargets = settingsApi.TARGET_ORDER.reduce(function (accumulator, key) {
      accumulator[key] = true;
      return accumulator;
    }, {});

    return Object.assign({}, settings, {
      hoverReveal: false,
      blurTargets: blurTargets
    });
  }
})();
