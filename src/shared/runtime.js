(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MESSAGE_TYPES = Object.freeze({
    applySettings: "WHATSAPP_BLUR_APPLY_SETTINGS",
    showAllTemporarily: "WHATSAPP_BLUR_SHOW_ALL_TEMPORARILY",
    hideAllTemporarily: "WHATSAPP_BLUR_HIDE_ALL_TEMPORARILY",
    bossKeyToggle: "WHATSAPP_BLUR_BOSS_KEY_TOGGLE",
    morseNotify: "WHATSAPP_BLUR_MORSE_NOTIFY",
    fakeMeetingGenerate: "WHATSAPP_BLUR_FAKE_MEETING_GENERATE",
    requestRefresh: "WHATSAPP_BLUR_REQUEST_REFRESH",
    desktopPetPreview: "WHATSAPP_BLUR_DESKTOP_PET_PREVIEW"
  });

  function createRuntimeState() {
    return {
      tempRevealUntil: 0,
      emergencyHideUntil: 0
    };
  }

  function computeTempRevealUntil(now, durationMs) {
    return now + durationMs;
  }

  function isTempRevealActive(state, now) {
    return state.tempRevealUntil > now;
  }

  function computeEmergencyHideUntil(now, durationMs) {
    return now + durationMs;
  }

  function isEmergencyHideActive(state, now) {
    return state.emergencyHideUntil > now;
  }

  function reduceRuntimeState(state, action) {
    switch (action.type) {
      case "reveal/started":
        return {
          tempRevealUntil: action.until,
          emergencyHideUntil: state.emergencyHideUntil
        };
      case "reveal/cleared":
        return {
          tempRevealUntil: 0,
          emergencyHideUntil: state.emergencyHideUntil
        };
      case "hide/started":
        return {
          tempRevealUntil: state.tempRevealUntil,
          emergencyHideUntil: action.until
        };
      case "hide/cleared":
        return {
          tempRevealUntil: state.tempRevealUntil,
          emergencyHideUntil: 0
        };
      default:
        return state;
    }
  }

  return {
    MESSAGE_TYPES,
    createRuntimeState,
    computeTempRevealUntil,
    isTempRevealActive,
    computeEmergencyHideUntil,
    isEmergencyHideActive,
    reduceRuntimeState
  };
});
