const settingsApi = globalThis.WhatsAppBlurSettings;
const i18nApi = globalThis.WhatsAppBlurI18n;
const runtimeApi = globalThis.WhatsAppBlurRuntime;
const selectorsApi = globalThis.WhatsAppBlurSelectors;
const dashboardApi = globalThis.WhatsAppBlurDashboardData;

const languageSelect = document.getElementById("language-select");
const presetSelect = document.getElementById("preset-select");
const enabledToggle = document.getElementById("enabled-toggle");
const hoverToggle = document.getElementById("hover-toggle");
const holdRevealToggle = document.getElementById("hold-reveal-toggle");
const idleBlurToggle = document.getElementById("idle-blur-toggle");
const idleTimeoutWrapper = document.getElementById("idle-timeout-wrapper");
const idleTimeoutSelect = document.getElementById("idle-timeout");
const bookmarkBarToggle = document.getElementById("bookmark-bar-toggle");
const keepWhatsAppAliveToggle = document.getElementById("keep-whatsapp-alive-toggle");
const pinnedContactsTextarea = document.getElementById("pinned-contacts");
const contactAliasesTextarea = document.getElementById("contact-aliases");
const pinnedContactGroupsTextarea = document.getElementById("pinned-contact-groups");
const bookmarkBarThemeSelect = document.getElementById("bookmark-bar-theme");
const bookmarkBarColorInput = document.getElementById("bookmark-bar-color");
const temporaryRevealSecondsInput = document.getElementById("temporary-reveal-seconds");
const targetsRoot = document.getElementById("targets-root");
const restoreButton = document.getElementById("restore-button");
const emergencyHideButton = document.getElementById("emergency-hide-button");
const showAllButton = document.getElementById("show-all-button");

const cinematicBlurToggle = document.getElementById("cinematic-blur-toggle");
const cinematicBlurStyleSelect = document.getElementById("cinematic-blur-style");
const bossKeyToggle = document.getElementById("boss-key-toggle");
const bossKeyThemeSelect = document.getElementById("boss-key-theme");
const bossKeyTestButton = document.getElementById("boss-key-test-button");
const readReceiptProtectionToggle = document.getElementById("read-receipt-protection-toggle");
const dashboardToggle = document.getElementById("dashboard-toggle");
const dashboardSummary = document.getElementById("dashboard-summary");
const dashboardTotalMessages = document.getElementById("dashboard-total-messages");
const dashboardActiveChats = document.getElementById("dashboard-active-chats");
const dashboardTopContact = document.getElementById("dashboard-top-contact");
const dashboardTopEmoji = document.getElementById("dashboard-top-emoji");
const danmuModeToggle = document.getElementById("danmu-mode-toggle");
const danmuSpeedSelect = document.getElementById("danmu-speed");
const morseNotificationsToggle = document.getElementById("morse-notifications-toggle");
const morseContactInput = document.getElementById("morse-contact");
const morseTestButton = document.getElementById("morse-test-button");
const fakeMeetingTemplateSelect = document.getElementById("fake-meeting-template");
const fakeMeetingToggle = document.getElementById("fake-meeting-toggle");
const fakeMeetingGenerateButton = document.getElementById("fake-meeting-generate-button");
const desktopPetEnabledToggle = document.getElementById("desktop-pet-enabled-toggle");
const desktopPetModeSelect = document.getElementById("desktop-pet-mode-select");
const desktopPetCornerSelect = document.getElementById("desktop-pet-corner-select");
const desktopPetSizeSelect = document.getElementById("desktop-pet-size-select");
const desktopPetColorInput = document.getElementById("desktop-pet-color-input");
const desktopPetHiddenToggle = document.getElementById("desktop-pet-hidden-toggle");
const desktopPetPreviewButton = document.getElementById("desktop-pet-preview-button");
const popupSectionOrder = Array.isArray(settingsApi.POPUP_SECTION_ORDER)
  ? settingsApi.POPUP_SECTION_ORDER
  : [];

let currentSettings = settingsApi.mergeSettings();
let currentLanguage = normalizePopupLanguage(currentSettings.language);
let sectionElementsByKey = new Map();

document.addEventListener("DOMContentLoaded", initializePopup);

async function initializePopup() {
  currentSettings = await readStoredSettings();
  currentLanguage = normalizePopupLanguage(currentSettings.language);
  renderLanguageOptions();
  renderPresetOptions();
  renderThemeOptions();
  renderTargets();
  initializeSectionAccordions();
  renderSettings(currentSettings);
  applyPopupTranslations();
  await refreshDashboardSummary();

  if (languageSelect) {
    languageSelect.addEventListener("change", onLanguageChanged);
  }
  if (presetSelect) {
    presetSelect.addEventListener("change", onPresetChanged);
  }
  enabledToggle.addEventListener("change", onToggleChanged);
  hoverToggle.addEventListener("change", onToggleChanged);
  if (holdRevealToggle) {
    holdRevealToggle.addEventListener("change", onHoldRevealToggleChanged);
  }
  idleBlurToggle.addEventListener("change", onIdleBlurToggleChanged);
  idleTimeoutSelect.addEventListener("change", onIdleTimeoutChanged);
  bookmarkBarToggle.addEventListener("change", onBookmarkBarToggleChanged);
  if (keepWhatsAppAliveToggle) {
    keepWhatsAppAliveToggle.addEventListener("change", onKeepWhatsAppAliveToggleChanged);
  }
  if (pinnedContactsTextarea) {
    pinnedContactsTextarea.addEventListener("change", onPinnedContactsChanged);
  }
  if (contactAliasesTextarea) {
    contactAliasesTextarea.addEventListener("change", onContactAliasesChanged);
  }
  if (pinnedContactGroupsTextarea) {
    pinnedContactGroupsTextarea.addEventListener("change", onPinnedContactGroupsChanged);
  }
  if (bookmarkBarThemeSelect) {
    bookmarkBarThemeSelect.addEventListener("change", onBookmarkBarThemeChanged);
  }
  if (bookmarkBarColorInput) {
    bookmarkBarColorInput.addEventListener("input", onBookmarkBarColorChanged);
  }
  if (temporaryRevealSecondsInput) {
    temporaryRevealSecondsInput.addEventListener("change", onTemporaryRevealSecondsChanged);
  }
  restoreButton.addEventListener("click", onRestoreClicked);
  if (emergencyHideButton) {
    emergencyHideButton.addEventListener("click", onEmergencyHideClicked);
  }
  showAllButton.addEventListener("click", onShowAllClicked);

  if (cinematicBlurToggle) {
    cinematicBlurToggle.addEventListener("change", onCinematicBlurToggleChanged);
  }
  if (cinematicBlurStyleSelect) {
    cinematicBlurStyleSelect.addEventListener("change", onCinematicBlurStyleChanged);
  }
  if (bossKeyToggle) {
    bossKeyToggle.addEventListener("change", onBossKeyToggleChanged);
  }
  if (bossKeyThemeSelect) {
    bossKeyThemeSelect.addEventListener("change", onBossKeyThemeChanged);
  }
  if (bossKeyTestButton) {
    bossKeyTestButton.addEventListener("click", onBossKeyTestClicked);
  }
  if (readReceiptProtectionToggle) {
    readReceiptProtectionToggle.addEventListener("change", onReadReceiptProtectionToggleChanged);
  }
  if (dashboardToggle) {
    dashboardToggle.addEventListener("change", onDashboardToggleChanged);
  }
  if (danmuModeToggle) {
    danmuModeToggle.addEventListener("change", onDanmuModeToggleChanged);
  }
  if (danmuSpeedSelect) {
    danmuSpeedSelect.addEventListener("change", onDanmuSpeedChanged);
  }
  if (morseNotificationsToggle) {
    morseNotificationsToggle.addEventListener("change", onMorseNotificationsToggleChanged);
  }
  if (morseContactInput) {
    morseContactInput.addEventListener("change", onMorseContactChanged);
  }
  if (morseTestButton) {
    morseTestButton.addEventListener("click", onMorseTestClicked);
  }
  if (fakeMeetingTemplateSelect) {
    fakeMeetingTemplateSelect.addEventListener("change", onFakeMeetingTemplateChanged);
  }
  if (fakeMeetingToggle) {
    fakeMeetingToggle.addEventListener("change", onFakeMeetingToggleChanged);
  }
  if (fakeMeetingGenerateButton) {
    fakeMeetingGenerateButton.addEventListener("click", onFakeMeetingGenerateClicked);
  }
  if (desktopPetEnabledToggle) {
    desktopPetEnabledToggle.addEventListener("change", onDesktopPetEnabledChanged);
  }
  if (desktopPetModeSelect) {
    desktopPetModeSelect.addEventListener("change", onDesktopPetModeChanged);
  }
  if (desktopPetCornerSelect) {
    desktopPetCornerSelect.addEventListener("change", onDesktopPetCornerChanged);
  }
  if (desktopPetSizeSelect) {
    desktopPetSizeSelect.addEventListener("change", onDesktopPetSizeChanged);
  }
  if (desktopPetColorInput) {
    desktopPetColorInput.addEventListener("input", onDesktopPetColorChanged);
  }
  if (desktopPetHiddenToggle) {
    desktopPetHiddenToggle.addEventListener("change", onDesktopPetHiddenChanged);
  }
  if (desktopPetPreviewButton) {
    desktopPetPreviewButton.addEventListener("click", onDesktopPetPreviewClicked);
  }
}

async function readStoredSettings() {
  const result = await chrome.storage.local.get(settingsApi.STORAGE_KEY);
  return settingsApi.mergeSettings(result[settingsApi.STORAGE_KEY]);
}

async function writeStoredSettings(nextSettings) {
  await chrome.storage.local.set({
    [settingsApi.STORAGE_KEY]: settingsApi.cloneSettings(nextSettings)
  });
}

function renderLanguageOptions() {
  if (!languageSelect || !i18nApi) {
    return;
  }

  languageSelect.innerHTML = "";

  i18nApi.LANGUAGE_ORDER.forEach(function (language) {
    const option = document.createElement("option");
    const meta = i18nApi.LANGUAGE_META[language] || {};

    option.value = language;
    option.textContent = meta.label || language;
    languageSelect.appendChild(option);
  });

  languageSelect.value = currentLanguage;
}

function renderTargets() {
  targetsRoot.innerHTML = "";

  settingsApi.TARGET_ORDER.forEach(function (targetKey) {
    const row = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");

    row.className = "target-row";
    checkbox.type = "checkbox";
    checkbox.dataset.targetKey = targetKey;
    text.textContent = translate("target." + targetKey, selectorsApi.TARGET_META[targetKey].label);

    checkbox.addEventListener("change", onTargetChanged);

    row.appendChild(text);
    row.appendChild(checkbox);
    targetsRoot.appendChild(row);
  });
}

function renderSettings(settings) {
  currentLanguage = normalizePopupLanguage(settings.language);
  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
  if (presetSelect) {
    presetSelect.value = settings.activePreset || "custom";
  }
  enabledToggle.checked = settings.enabled;
  hoverToggle.checked = settings.hoverReveal;
  if (holdRevealToggle) {
    holdRevealToggle.checked = settings.holdRevealEnabled;
  }
  idleBlurToggle.checked = settings.idleBlurEnabled;
  idleTimeoutWrapper.style.display = settings.idleBlurEnabled ? "block" : "none";
  idleTimeoutSelect.value = String(settings.idleTimeoutMs || 30000);
  bookmarkBarToggle.checked = settings.bookmarkBarEnabled;
  if (keepWhatsAppAliveToggle) {
    keepWhatsAppAliveToggle.checked = settings.keepWhatsAppAlive;
  }
  if (pinnedContactsTextarea) {
    pinnedContactsTextarea.value = Array.isArray(settings.pinnedContacts)
      ? settings.pinnedContacts.join("\n")
      : "";
  }
  if (contactAliasesTextarea) {
    contactAliasesTextarea.value = formatAliasesForTextarea(settings.contactAliases);
  }
  if (pinnedContactGroupsTextarea) {
    pinnedContactGroupsTextarea.value = formatGroupsForTextarea(settings.pinnedContactGroups);
  }
  if (bookmarkBarThemeSelect) {
    bookmarkBarThemeSelect.value = settings.bookmarkBarTheme || "classic";
  }
  if (bookmarkBarColorInput) {
    bookmarkBarColorInput.value = settings.bookmarkBarColor || "#f1f3f4";
  }
  if (temporaryRevealSecondsInput) {
    temporaryRevealSecondsInput.value = String(settings.temporaryRevealSeconds || 5);
  }
  updateTemporaryActionLabels(settings.temporaryRevealSeconds || 5);

  if (cinematicBlurToggle) {
    cinematicBlurToggle.checked = settings.cinematicBlurEnabled;
  }
  if (cinematicBlurStyleSelect) {
    cinematicBlurStyleSelect.value = settings.cinematicBlurStyle || "scanline";
  }
  if (bossKeyToggle) {
    bossKeyToggle.checked = settings.bossKeyEnabled;
  }
  if (bossKeyThemeSelect) {
    bossKeyThemeSelect.value = settings.bossKeyTheme || "spreadsheet";
  }
  if (readReceiptProtectionToggle) {
    readReceiptProtectionToggle.checked = settings.readReceiptProtectionEnabled;
  }
  if (dashboardToggle) {
    dashboardToggle.checked = settings.dashboardEnabled;
  }
  if (dashboardSummary) {
    dashboardSummary.style.display = settings.dashboardEnabled ? "grid" : "none";
  }
  if (danmuModeToggle) {
    danmuModeToggle.checked = settings.danmuModeEnabled;
  }
  if (danmuSpeedSelect) {
    danmuSpeedSelect.value = settings.danmuSpeed || "normal";
  }
  if (morseNotificationsToggle) {
    morseNotificationsToggle.checked = settings.morseNotificationsEnabled;
  }
  if (morseContactInput) {
    morseContactInput.value = settings.morseContact || "";
  }
  if (fakeMeetingTemplateSelect) {
    fakeMeetingTemplateSelect.value = settings.fakeMeetingTemplate || "calendar";
  }
  if (fakeMeetingToggle) {
    fakeMeetingToggle.checked = settings.fakeMeetingEnabled;
  }
  if (fakeMeetingGenerateButton) {
    fakeMeetingGenerateButton.disabled = !settings.fakeMeetingEnabled;
  }
  if (desktopPetEnabledToggle) {
    desktopPetEnabledToggle.checked = settings.desktopPetEnabled;
  }
  if (desktopPetModeSelect) {
    desktopPetModeSelect.value = settings.desktopPetMode || "hybrid";
  }
  if (desktopPetCornerSelect) {
    desktopPetCornerSelect.value = settings.desktopPetCorner || "bottom-right";
  }
  if (desktopPetSizeSelect) {
    desktopPetSizeSelect.value = settings.desktopPetSize || "medium";
  }
  if (desktopPetColorInput) {
    desktopPetColorInput.value = settings.desktopPetColor || "#ffd782";
  }
  if (desktopPetHiddenToggle) {
    desktopPetHiddenToggle.checked = settings.desktopPetHidden;
  }
  if (desktopPetPreviewButton) {
    desktopPetPreviewButton.disabled = !settings.desktopPetEnabled;
  }

  Array.from(targetsRoot.querySelectorAll("input[data-target-key]")).forEach(function (input) {
    input.checked = settings.blurTargets[input.dataset.targetKey];
    input.disabled = !settings.enabled;
  });

  applySectionExpansionState(settings.popupExpandedSections);
}

function renderPresetOptions() {
  if (!presetSelect) {
    return;
  }

  presetSelect.innerHTML = "";

  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = translate("preset.custom", "Custom");
  presetSelect.appendChild(customOption);

  settingsApi.PRESET_ORDER.forEach(function (presetName) {
    const option = document.createElement("option");
    option.value = presetName;
    option.textContent = translate("preset." + presetName, titleizePresetName(presetName));
    presetSelect.appendChild(option);
  });
}

function renderThemeOptions() {
  if (!bookmarkBarThemeSelect) {
    return;
  }

  bookmarkBarThemeSelect.innerHTML = "";

  settingsApi.BOOKMARK_BAR_THEMES.forEach(function (themeName) {
    const option = document.createElement("option");
    option.value = themeName;
    option.textContent = translate("theme." + themeName, titleizePresetName(themeName));
    bookmarkBarThemeSelect.appendChild(option);
  });
}

async function onLanguageChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentLanguage = normalizePopupLanguage(languageSelect.value);
  currentSettings.language = currentLanguage;

  renderPresetOptions();
  renderThemeOptions();
  renderTargets();
  renderSettings(currentSettings);
  applyPopupTranslations();

  await writeStoredSettings(currentSettings);
}

async function onToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.enabled = enabledToggle.checked;
  currentSettings.hoverReveal = hoverToggle.checked;
  markCustomPreset();

  await persistAndBroadcast();
}

async function onPresetChanged() {
  currentSettings = settingsApi.applyPreset(currentSettings, presetSelect.value);
  renderSettings(currentSettings);
  await persistAndBroadcast();
}

async function onIdleBlurToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.idleBlurEnabled = idleBlurToggle.checked;
  markCustomPreset();

  await persistAndBroadcast();
}

async function onIdleTimeoutChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.idleTimeoutMs = parseInt(idleTimeoutSelect.value, 10);
  markCustomPreset();

  await persistAndBroadcast();
}

async function onBookmarkBarToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.bookmarkBarEnabled = bookmarkBarToggle.checked;
  markCustomPreset();

  await persistAndBroadcast();
  await broadcastBookmarkBarToAllTabs(currentSettings.bookmarkBarEnabled);
}

async function onKeepWhatsAppAliveToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.keepWhatsAppAlive = keepWhatsAppAliveToggle.checked;
  markCustomPreset();

  await persistAndBroadcast();
  try {
    await chrome.runtime.sendMessage({
      type: "KEEP_WHATSAPP_ALIVE_CHANGED",
      keepWhatsAppAlive: currentSettings.keepWhatsAppAlive
    });
  } catch (e) {
    // ignore
  }
}

async function onPinnedContactsChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  const lines = (pinnedContactsTextarea.value || "")
    .split("\n")
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
  currentSettings.pinnedContacts = lines;
  markCustomPreset();

  await persistAndBroadcast();
}

async function onContactAliasesChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.contactAliases = parseAliases(contactAliasesTextarea.value || "");
  markCustomPreset();

  await persistAndBroadcast();
}

async function onPinnedContactGroupsChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.pinnedContactGroups = parsePinnedContactGroups(pinnedContactGroupsTextarea.value || "");
  markCustomPreset();

  await persistAndBroadcast();
}

async function onBookmarkBarThemeChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.bookmarkBarTheme = bookmarkBarThemeSelect.value || "classic";
  markCustomPreset();

  await persistAndBroadcast();
}

async function onBookmarkBarColorChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.bookmarkBarColor = bookmarkBarColorInput.value || "#f1f3f4";
  markCustomPreset();

  await persistAndBroadcast();
}

async function onTemporaryRevealSecondsChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);

  const parsedSeconds = parseInt(temporaryRevealSecondsInput.value, 10);
  currentSettings.temporaryRevealSeconds =
    Number.isFinite(parsedSeconds) && parsedSeconds > 0
      ? parsedSeconds
      : settingsApi.DEFAULT_SETTINGS.temporaryRevealSeconds;
  markCustomPreset();

  await persistAndBroadcast();
}

async function onSectionToggleClicked(sectionKey) {
  if (!sectionKey) {
    return;
  }

  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.popupExpandedSections[sectionKey] =
    !currentSettings.popupExpandedSections[sectionKey];

  applySectionExpansionState(currentSettings.popupExpandedSections);
  await writeStoredSettings(currentSettings);
}

async function onHoldRevealToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.holdRevealEnabled = holdRevealToggle.checked;
  markCustomPreset();

  await persistAndBroadcast();
}

async function onCinematicBlurToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.cinematicBlurEnabled = cinematicBlurToggle.checked;
  markCustomPreset();
  await persistAndBroadcast();
}

async function onCinematicBlurStyleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.cinematicBlurStyle = cinematicBlurStyleSelect.value || "scanline";
  markCustomPreset();
  await persistAndBroadcast();
}

async function onBossKeyToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.bossKeyEnabled = bossKeyToggle.checked;
  markCustomPreset();
  await persistAndBroadcast();
}

async function onBossKeyThemeChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.bossKeyTheme = bossKeyThemeSelect.value || "spreadsheet";
  markCustomPreset();
  await persistAndBroadcast();
}

async function onBossKeyTestClicked() {
  await broadcastMessage({
    type: runtimeApi.MESSAGE_TYPES.bossKeyToggle
  });
}

async function onReadReceiptProtectionToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.readReceiptProtectionEnabled = readReceiptProtectionToggle.checked;
  markCustomPreset();
  await persistAndBroadcast();
}

async function onDashboardToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.dashboardEnabled = dashboardToggle.checked;
  markCustomPreset();
  await persistAndBroadcast();
  await refreshDashboardSummary();
}

async function onDanmuModeToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.danmuModeEnabled = danmuModeToggle.checked;
  markCustomPreset();
  await persistAndBroadcast();
}

async function onDanmuSpeedChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.danmuSpeed = danmuSpeedSelect.value || "normal";
  markCustomPreset();
  await persistAndBroadcast();
}

async function onMorseNotificationsToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.morseNotificationsEnabled = morseNotificationsToggle.checked;
  markCustomPreset();
  await persistAndBroadcast();
}

async function onMorseContactChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.morseContact = morseContactInput.value || "";
  markCustomPreset();
  await persistAndBroadcast();
}

async function onMorseTestClicked() {
  const contactName = morseContactInput.value || "TEST";
  try {
    await chrome.runtime.sendMessage({
      type: runtimeApi.MESSAGE_TYPES.morseNotify,
      contactName: contactName
    });
  } catch (e) {
    // ignore
  }
}

async function onFakeMeetingTemplateChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.fakeMeetingTemplate = fakeMeetingTemplateSelect.value || "calendar";
  markCustomPreset();
  await persistAndBroadcast();
}

async function onFakeMeetingToggleChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.fakeMeetingEnabled = fakeMeetingToggle.checked;
  markCustomPreset();
  await persistAndBroadcast();
}

async function onFakeMeetingGenerateClicked() {
  if (!currentSettings.fakeMeetingEnabled) {
    return;
  }

  await broadcastMessage({
    type: runtimeApi.MESSAGE_TYPES.fakeMeetingGenerate,
    template: currentSettings.fakeMeetingTemplate || "calendar"
  });
}

async function onDesktopPetEnabledChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.desktopPetEnabled = desktopPetEnabledToggle.checked;
  markCustomPreset();

  await persistAndBroadcast();
}

async function onDesktopPetModeChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.desktopPetMode = desktopPetModeSelect.value || "hybrid";
  markCustomPreset();

  await persistAndBroadcast();
}

async function onDesktopPetCornerChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.desktopPetCorner = desktopPetCornerSelect.value || "bottom-right";
  markCustomPreset();

  await persistAndBroadcast();
}

async function onDesktopPetSizeChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.desktopPetSize = desktopPetSizeSelect.value || "medium";
  markCustomPreset();

  await persistAndBroadcast();
}

async function onDesktopPetColorChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.desktopPetColor = desktopPetColorInput.value || "#ffd782";
  markCustomPreset();

  await persistAndBroadcast();
}

async function onDesktopPetHiddenChanged() {
  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.desktopPetHidden = desktopPetHiddenToggle.checked;
  markCustomPreset();

  await persistAndBroadcast();
}

async function onDesktopPetPreviewClicked() {
  if (!runtimeApi.MESSAGE_TYPES || !runtimeApi.MESSAGE_TYPES.desktopPetPreview) {
    return;
  }

  await sendMessageToActiveTab({
    type: runtimeApi.MESSAGE_TYPES.desktopPetPreview
  });
}

async function refreshDashboardSummary() {
  if (
    !currentSettings.dashboardEnabled ||
    !dashboardApi ||
    typeof dashboardApi.summarizeBookmarkData !== "function"
  ) {
    return;
  }

  try {
    const result = await chrome.storage.local.get(dashboardApi.BOOKMARK_DATA_KEY);
    const summary = dashboardApi.summarizeBookmarkData(
      result[dashboardApi.BOOKMARK_DATA_KEY]
    );

    if (dashboardTotalMessages) {
      dashboardTotalMessages.textContent = String(summary.totalMessages);
    }
    if (dashboardActiveChats) {
      dashboardActiveChats.textContent = String(summary.activeChats);
    }
    if (dashboardTopContact) {
      dashboardTopContact.textContent = summary.topContact || "-";
    }
    if (dashboardTopEmoji) {
      dashboardTopEmoji.textContent = summary.topEmoji || "-";
    }
  } catch (error) {
    // Keep the zero-state summary when cache access is unavailable.
  }
}

async function broadcastBookmarkBarToAllTabs(enabled) {
  try {
    const tabs = await chrome.tabs.query({});
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      await applyBookmarkBarToTab(tab, enabled);
    }
  } catch (e) {
    // Ignore errors from tabs.query itself
  }
}

async function applyBookmarkBarToTab(tab, enabled) {
  if (!tab || !tab.id) {
    return;
  }

  const message = {
    type: "BOOKMARK_BAR_APPLY",
    enabled: enabled
  };

  try {
    await chrome.tabs.sendMessage(tab.id, message);
    return;
  } catch (error) {
    if (!enabled) {
      return;
    }
  }

  const injected = await injectBookmarkBarIntoTab(tab.id);

  if (!injected) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    return;
  }
}

async function injectBookmarkBarIntoTab(tabId) {
  if (!chrome.scripting) {
    return false;
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["src/content/bookmark-bar.css"]
    });
  } catch (error) {
    // Ignore CSS injection errors; script injection is the critical step.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["src/content/bookmark-bar.js"]
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function onTargetChanged(event) {
  const targetKey = event.target.dataset.targetKey;

  currentSettings = settingsApi.cloneSettings(currentSettings);
  currentSettings.blurTargets[targetKey] = event.target.checked;

  await persistAndBroadcast();
}

async function onRestoreClicked() {
  currentSettings = await readStoredSettings();
  currentLanguage = normalizePopupLanguage(currentSettings.language);
  renderPresetOptions();
  renderThemeOptions();
  renderTargets();
  renderSettings(currentSettings);
  applyPopupTranslations();
  await broadcastMessage({
    type: runtimeApi.MESSAGE_TYPES.applySettings,
    settings: currentSettings
  });
}

async function onShowAllClicked() {
  const durationSeconds =
    typeof currentSettings.temporaryRevealSeconds === "number" && currentSettings.temporaryRevealSeconds > 0
      ? currentSettings.temporaryRevealSeconds
      : settingsApi.DEFAULT_SETTINGS.temporaryRevealSeconds;

  await broadcastMessage({
    type: runtimeApi.MESSAGE_TYPES.showAllTemporarily,
    durationMs: durationSeconds * 1000
  });
}

async function onEmergencyHideClicked() {
  const durationSeconds =
    typeof currentSettings.temporaryRevealSeconds === "number" && currentSettings.temporaryRevealSeconds > 0
      ? currentSettings.temporaryRevealSeconds
      : settingsApi.DEFAULT_SETTINGS.temporaryRevealSeconds;

  await broadcastMessage({
    type: runtimeApi.MESSAGE_TYPES.hideAllTemporarily,
    durationMs: durationSeconds * 1000
  });
}

async function persistAndBroadcast() {
  renderSettings(currentSettings);
  applyPopupTranslations();
  await writeStoredSettings(currentSettings);
  await broadcastMessage({
    type: runtimeApi.MESSAGE_TYPES.applySettings,
    settings: currentSettings
  });
}

async function broadcastMessage(message) {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
    url: "https://web.whatsapp.com/*"
  });

  if (!tabs.length) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabs[0].id, message);
  } catch (error) {
    return;
  }
}

async function sendMessageToActiveTab(message) {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tabs.length) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabs[0].id, message);
  } catch (error) {
    return;
  }
}

function updateShowAllButtonLabel(durationSeconds) {
  if (!showAllButton && !emergencyHideButton) {
    return;
  }

  const normalizedSeconds =
    typeof durationSeconds === "number" && durationSeconds > 0
      ? durationSeconds
      : settingsApi.DEFAULT_SETTINGS.temporaryRevealSeconds;

  if (showAllButton) {
    showAllButton.textContent = translate("action.showAllForSeconds", "Show everything for " + normalizedSeconds + " seconds", {
      seconds: normalizedSeconds
    });
  }
  if (emergencyHideButton) {
    emergencyHideButton.textContent = translate("action.hideEverythingForSeconds", "Hide everything for " + normalizedSeconds + " seconds", {
      seconds: normalizedSeconds
    });
  }
}

function updateTemporaryActionLabels(durationSeconds) {
  updateShowAllButtonLabel(durationSeconds);
}

function markCustomPreset() {
  if (currentSettings.activePreset !== "custom") {
    currentSettings.activePreset = "custom";
  }
}

function parseAliases(rawValue) {
  return (rawValue || "")
    .split("\n")
    .reduce(function (accumulator, line) {
      const normalized = line.trim();
      if (!normalized) {
        return accumulator;
      }

      const separatorMatch = normalized.match(/^(.*?)\s*(?:=>|=|:)\s*(.*?)$/);
      if (!separatorMatch) {
        return accumulator;
      }

      const chatName = separatorMatch[1].trim();
      const alias = separatorMatch[2].trim();
      if (!chatName || !alias) {
        return accumulator;
      }

      accumulator[chatName] = alias;
      return accumulator;
    }, {});
}

function parsePinnedContactGroups(rawValue) {
  return (rawValue || "")
    .split("\n")
    .reduce(function (accumulator, line) {
      const normalized = line.trim();
      if (!normalized) {
        return accumulator;
      }

      const separatorIndex = normalized.indexOf(":");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const name = normalized.slice(0, separatorIndex).trim();
      const contactList = normalized.slice(separatorIndex + 1).trim();
      if (!name || !contactList) {
        return accumulator;
      }

      const contacts = contactList
        .split(",")
        .map(function (value) {
          return value.trim();
        })
        .filter(function (value) {
          return value.length > 0;
        });

      if (contacts.length === 0) {
        return accumulator;
      }

      accumulator.push({
        name: name,
        contacts: Array.from(new Set(contacts))
      });
      return accumulator;
    }, []);
}

function formatAliasesForTextarea(contactAliases) {
  if (!contactAliases || typeof contactAliases !== "object") {
    return "";
  }

  return Object.keys(contactAliases)
    .sort()
    .map(function (chatName) {
      return chatName + " => " + contactAliases[chatName];
    })
    .join("\n");
}

function formatGroupsForTextarea(groups) {
  if (!Array.isArray(groups)) {
    return "";
  }

  return groups
    .map(function (group) {
      return group.name + ": " + group.contacts.join(", ");
    })
    .join("\n");
}

function initializeSectionAccordions() {
  sectionElementsByKey = new Map();

  if (!document.querySelectorAll) {
    return;
  }

  Array.from(document.querySelectorAll(".popup__section[data-section-key]")).forEach(function (section) {
    const sectionKey = section.dataset ? section.dataset.sectionKey : "";
    const toggle = document.getElementById("section-toggle-" + sectionKey);
    const content = document.getElementById("section-content-" + sectionKey);

    if (!sectionKey || !toggle || !content) {
      return;
    }

    sectionElementsByKey.set(sectionKey, {
      section: section,
      toggle: toggle,
      content: content
    });

    toggle.addEventListener("click", function () {
      return onSectionToggleClicked(sectionKey);
    });
  });
}

function applySectionExpansionState(expandedSections) {
  popupSectionOrder.forEach(function (sectionKey) {
    const entry = sectionElementsByKey.get(sectionKey);
    if (!entry) {
      return;
    }

    const expanded = !!(expandedSections && expandedSections[sectionKey]);
    entry.toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    entry.content.hidden = !expanded;
  });
}

function applyPopupTranslations() {
  if (document.documentElement) {
    const meta = i18nApi && i18nApi.LANGUAGE_META
      ? i18nApi.LANGUAGE_META[currentLanguage]
      : null;
    document.documentElement.lang = meta && meta.htmlLang ? meta.htmlLang : currentLanguage;
  }

  const replacements = {
    seconds: getTemporaryRevealSeconds()
  };

  translateElements("[data-i18n]", function (element, key) {
    element.textContent = translate(key, element.textContent, replacements);
  });
  translateElements("[data-i18n-placeholder]", function (element, key) {
    element.placeholder = translate(key, element.placeholder, replacements);
  });
  translateElements("[data-i18n-aria-label]", function (element, key) {
    const fallback = typeof element.getAttribute === "function"
      ? element.getAttribute("aria-label")
      : "";
    const translated = translate(key, fallback, replacements);
    if (typeof element.setAttribute === "function") {
      element.setAttribute("aria-label", translated);
    }
  });

  updateTemporaryActionLabels(replacements.seconds);
}

function translateElements(selector, callback) {
  if (!document.querySelectorAll) {
    return;
  }

  Array.from(document.querySelectorAll(selector)).forEach(function (element) {
    const key = element.dataset ? element.dataset[selectorToDatasetKey(selector)] : "";
    if (key) {
      callback(element, key);
    }
  });
}

function selectorToDatasetKey(selector) {
  if (selector === "[data-i18n-placeholder]") {
    return "i18nPlaceholder";
  }
  if (selector === "[data-i18n-aria-label]") {
    return "i18nAriaLabel";
  }
  return "i18n";
}

function translate(key, fallback, replacements) {
  if (!i18nApi || typeof i18nApi.getMessage !== "function") {
    return fallback;
  }

  const translated = i18nApi.getMessage(currentLanguage, key, replacements);
  return translated === key && typeof fallback === "string" ? fallback : translated;
}

function normalizePopupLanguage(language) {
  if (i18nApi && typeof i18nApi.normalizeLanguage === "function") {
    return i18nApi.normalizeLanguage(language);
  }

  return settingsApi.LANGUAGE_ORDER.includes(language) ? language : settingsApi.DEFAULT_SETTINGS.language;
}

function getTemporaryRevealSeconds() {
  return typeof currentSettings.temporaryRevealSeconds === "number" &&
    currentSettings.temporaryRevealSeconds > 0
    ? currentSettings.temporaryRevealSeconds
    : settingsApi.DEFAULT_SETTINGS.temporaryRevealSeconds;
}

function titleizePresetName(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
}
