(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurBossKey = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const THEMES = Object.freeze(["spreadsheet", "vscode", "terminal"]);
  const DATA_KEY = "waBookmarkBarData";
  const TAB_META = Object.freeze({
    spreadsheet: {
      title: "Q3 Operating Plan - Sheets",
      color: "#0f9d58",
      glyph: "S"
    },
    vscode: {
      title: "operations-dashboard - Visual Studio Code",
      color: "#1684d2",
      glyph: "<>"
    },
    terminal: {
      title: "deploy@workstation: ~/operations",
      color: "#202124",
      glyph: ">_"
    }
  });

  let overlayElement = null;
  let isActive = false;
  let activeTheme = "spreadsheet";
  let hiddenAppElement = null;
  let previousAppVisibility = "";
  let previousTitle = "";
  let previousIcons = [];
  let createdIcon = null;
  let storageListener = null;
  let cachedData = normalizeData();
  let selectedChatId = "";

  function toggle(theme) {
    if (isActive) {
      hide();
      return;
    }
    show(theme);
  }

  function show(theme) {
    if (isActive) {
      hide();
    }

    activeTheme = THEMES.includes(theme) ? theme : "spreadsheet";
    overlayElement = document.createElement("div");
    overlayElement.className =
      "wa-boss-key-overlay wa-boss-key-overlay--" + activeTheme;
    overlayElement.id = "wa-boss-key-overlay";
    overlayElement.innerHTML =
      '<div class="wa-boss-workspace">' +
      renderTheme(activeTheme) +
      renderCommunications() +
      "</div>";
    document.body.appendChild(overlayElement);

    const appElement = document.getElementById("app");
    if (appElement) {
      hiddenAppElement = appElement;
      previousAppVisibility = appElement.style.visibility;
      appElement.style.visibility = "hidden";
    }

    isActive = true;
    applyTabCamouflage(activeTheme);
    bindCommunications();
    subscribeToStorage();
    void loadCachedData();
  }

  function hide() {
    unsubscribeFromStorage();

    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }

    if (hiddenAppElement) {
      hiddenAppElement.style.visibility = previousAppVisibility;
      hiddenAppElement = null;
      previousAppVisibility = "";
    }

    restoreTabCamouflage();
    selectedChatId = "";
    isActive = false;
  }

  function getActive() {
    return isActive;
  }

  function renderTheme(theme) {
    if (theme === "vscode") {
      return renderVSCode();
    }
    if (theme === "terminal") {
      return renderTerminal();
    }
    return renderSpreadsheet();
  }

  function renderSpreadsheet() {
    const columns = ["", "A", "B", "C", "D", "E", "F", "G", "H"];
    const departments = ["Platform", "Growth", "Support", "Security", "Finance", "People"];
    const rows = [];

    rows.push(
      '<div class="wa-boss-sheet-row wa-boss-sheet-row--head">' +
        columns
          .map(function (column) {
            return '<div class="wa-boss-sheet-cell">' + column + "</div>";
          })
          .join("") +
        "</div>"
    );

    for (let row = 1; row <= 24; row += 1) {
      const department = departments[(row - 2 + departments.length) % departments.length];
      const values =
        row === 1
          ? ["Department", "Owner", "Budget", "Actual", "Variance", "Q3", "Q4", "Status"]
          : [
              department,
              ["M. Chen", "A. Patel", "S. Wong", "J. Kim"][row % 4],
              "$" + (42 + row * 7) + ",000",
              "$" + (38 + row * 6) + ",500",
              (row % 3 === 0 ? "-" : "+") + (row % 9 + 1) + ".2%",
              String(71 + (row % 25)) + "%",
              String(55 + (row % 31)) + "%",
              row % 4 === 0 ? "Review" : "On track"
            ];
      rows.push(
        '<div class="wa-boss-sheet-row">' +
          ['<div class="wa-boss-sheet-cell wa-boss-sheet-index">' + row + "</div>"]
            .concat(
              values.map(function (value, index) {
                const className =
                  index === 7
                    ? "wa-boss-sheet-cell wa-boss-sheet-status"
                    : "wa-boss-sheet-cell";
                return '<div class="' + className + '">' + value + "</div>";
              })
            )
            .join("") +
          "</div>"
      );
    }

    return (
      '<main class="wa-boss-main wa-boss-sheet-app">' +
      '<header class="wa-boss-sheet-titlebar">' +
      '<div class="wa-boss-sheet-logo">S</div>' +
      '<div><strong>Q3 Operating Plan</strong><span>Saved to Drive</span></div>' +
      '<div class="wa-boss-sheet-actions"><button>Share</button><span class="wa-boss-user">KC</span></div>' +
      "</header>" +
      '<nav class="wa-boss-sheet-menu">File Edit View Insert Format Data Tools Extensions Help</nav>' +
      '<div class="wa-boss-sheet-tools"><span>↶</span><span>↷</span><span>100%</span><span>$</span><span>%</span><span>.0</span><span>Arial</span><span>10</span><b>B</b><i>I</i><u>U</u></div>' +
      '<div class="wa-boss-formula"><span>A1</span><b>fx</b><span>=SUM(C3:C24)</span></div>' +
      '<section class="wa-boss-sheet-grid">' +
      rows.join("") +
      "</section>" +
      '<footer class="wa-boss-sheet-tabs"><button>+</button><span class="is-active">Operating Plan</span><span>Headcount</span><span>Forecast</span><span>Assumptions</span></footer>' +
      "</main>"
    );
  }

  function renderVSCode() {
    const code = [
      '<span class="kw">import</span> { buildForecast } <span class="kw">from</span> <span class="str">"./forecast.js"</span>;',
      "",
      '<span class="kw">const</span> regions = [<span class="str">"APAC"</span>, <span class="str">"EMEA"</span>, <span class="str">"AMER"</span>];',
      '<span class="kw">const</span> quarter = <span class="str">"2026-Q3"</span>;',
      "",
      '<span class="kw">export async function</span> <span class="fn">generatePlan</span>() {',
      '  <span class="kw">const</span> inputs = <span class="kw">await</span> loadRegionalInputs(regions);',
      '  <span class="kw">const</span> forecast = buildForecast(inputs, { quarter });',
      "",
      "  validateAssumptions(forecast);",
      '  <span class="kw">return</span> publishWorkbook(forecast);',
      "}",
      "",
      '<span class="fn">generatePlan</span>()',
      '  .then(() => logger.info(<span class="str">"Forecast published"</span>))',
      "  .catch(logger.error);"
    ];

    return (
      '<main class="wa-boss-main wa-boss-code-app">' +
      '<aside class="wa-boss-activity"><span class="is-active">▱</span><span>⌕</span><span>⑂</span><span>▷</span><span>▧</span><span class="wa-boss-activity-bottom">⚙</span></aside>' +
      '<aside class="wa-boss-explorer"><h3>EXPLORER</h3><div class="wa-boss-project">⌄ OPERATIONS-DASHBOARD</div>' +
      '<div class="wa-boss-tree">⌄ src</div><div class="wa-boss-tree indent">◇ api</div><div class="wa-boss-tree indent">◇ components</div>' +
      '<div class="wa-boss-tree indent active">JS forecast.js</div><div class="wa-boss-tree indent">JS metrics.js</div>' +
      '<div class="wa-boss-tree">⌄ tests</div><div class="wa-boss-tree indent">JS forecast.test.js</div>' +
      '<div class="wa-boss-tree">{} package.json</div><div class="wa-boss-tree"># README.md</div></aside>' +
      '<section class="wa-boss-editor-wrap"><div class="wa-boss-code-tabs"><span class="active">JS forecast.js&nbsp; ×</span><span>JS metrics.js&nbsp; ×</span><span>README.md&nbsp; ×</span></div>' +
      '<div class="wa-boss-breadcrumb">src › forecast.js › generatePlan</div>' +
      '<div class="wa-boss-editor">' +
      code
        .map(function (line, index) {
          return '<div class="wa-boss-code-line"><span>' + (index + 1) + "</span><code>" + line + "</code></div>";
        })
        .join("") +
      '<div class="wa-boss-minimap"></div></div>' +
      '<div class="wa-boss-problems"><div class="wa-boss-problem-tabs"><b>PROBLEMS</b><span>OUTPUT</span><span>DEBUG CONSOLE</span><span>TERMINAL</span></div>' +
      '<p>✓ 0 errors &nbsp;&nbsp; △ 0 warnings &nbsp;&nbsp; Workspace analysis complete</p></div>' +
      '<footer class="wa-boss-code-status"><span>⑂ main*</span><span>↻</span><span class="push">Ln 16, Col 24&nbsp;&nbsp; Spaces: 2&nbsp;&nbsp; UTF-8&nbsp;&nbsp; JavaScript</span></footer>' +
      "</section></main>"
    );
  }

  function renderTerminal() {
    const lines = [
      ['prompt', "deploy@workstation ~/operations $ git status --short"],
      ["out", " M config/production.yml"],
      ["out", " M src/services/forecast.ts"],
      ['prompt', "deploy@workstation ~/operations $ npm run test:ci"],
      ["muted", "> operations-dashboard@3.8.0 test:ci"],
      ["muted", "> vitest run --coverage"],
      ["ok", "✓ tests/forecast.test.ts (18 tests) 412ms"],
      ["ok", "✓ tests/pipeline.test.ts (11 tests) 286ms"],
      ["ok", "✓ tests/permissions.test.ts (9 tests) 191ms"],
      ["out", "Test Files  3 passed (3)"],
      ["out", "Tests       38 passed (38)"],
      ["out", "Duration    1.42s"],
      ['prompt', "deploy@workstation ~/operations $ ./scripts/deploy --env staging"],
      ["muted", "[12:41:07] Building release artifact..."],
      ["muted", "[12:41:10] Uploading operations-dashboard-3.8.0.tgz"],
      ["ok", "[12:41:14] Health checks passed (6/6)"],
      ["ok", "[12:41:15] Deployment complete"],
      ['prompt', 'deploy@workstation ~/operations $ <span class="wa-boss-cursor"> </span>']
    ];

    return (
      '<main class="wa-boss-main wa-boss-terminal-app">' +
      '<header class="wa-boss-terminal-top"><span class="red"></span><span class="yellow"></span><span class="green"></span><b>operations — zsh — 132×42</b><button>+</button></header>' +
      '<div class="wa-boss-terminal-tabs"><span class="active">1. deploy</span><span>2. logs</span><span>3. metrics</span></div>' +
      '<section class="wa-boss-terminal-screen">' +
      '<div class="wa-boss-terminal-banner">Operations Console <small>staging / ap-east-1</small></div>' +
      lines
        .map(function (line) {
          return '<div class="' + line[0] + '">' + line[1] + "</div>";
        })
        .join("") +
      "</section>" +
      '<aside class="wa-boss-terminal-monitor"><h3>SERVICE HEALTH</h3><div><span>api-gateway</span><b>● healthy</b></div><div><span>worker</span><b>● healthy</b></div><div><span>cache</span><b>● healthy</b></div><div><span>queue depth</span><em>12</em></div><h3>RECENT JOBS</h3><p>#8942 forecast-sync&nbsp; ✓</p><p>#8941 cache-warm&nbsp; ✓</p><p>#8940 report-build&nbsp; ✓</p></aside>' +
      "</main>"
    );
  }

  function renderCommunications() {
    return (
      '<section class="wa-boss-comms" aria-label="Activity panel">' +
      '<header class="wa-boss-comms-header"><div><b>ACTIVITY</b><span class="wa-boss-comms-dot"></span><span id="wa-boss-comms-status">Loading workspace updates…</span></div>' +
      '<select id="wa-boss-chat-select" aria-label="Select activity channel"><option>Loading…</option></select></header>' +
      '<div class="wa-boss-comms-messages" id="wa-boss-comms-messages"><div class="wa-boss-comms-empty">Loading recent activity…</div></div>' +
      '<form class="wa-boss-comms-compose" id="wa-boss-comms-form"><span class="wa-boss-compose-prefix">›</span>' +
      '<input id="wa-boss-comms-input" type="text" autocomplete="off" placeholder="Reply to this activity…" aria-label="Reply message">' +
      '<button type="submit">Send</button></form>' +
      "</section>"
    );
  }

  function bindCommunications() {
    if (!overlayElement || typeof overlayElement.querySelector !== "function") {
      return;
    }

    const select = overlayElement.querySelector("#wa-boss-chat-select");
    const form = overlayElement.querySelector("#wa-boss-comms-form");

    if (select) {
      select.addEventListener("change", function () {
        selectedChatId = select.value;
        renderMessages();
      });
    }

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        void sendReply();
      });
    }
  }

  async function loadCachedData() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.local ||
      typeof chrome.storage.local.get !== "function"
    ) {
      renderChatData();
      return;
    }

    try {
      const result = await chrome.storage.local.get(DATA_KEY);
      cachedData = normalizeData(result && result[DATA_KEY]);
    } catch (error) {
      cachedData = normalizeData();
    }

    renderChatData();
  }

  function renderChatData() {
    if (!overlayElement || typeof overlayElement.querySelector !== "function") {
      return;
    }

    const select = overlayElement.querySelector("#wa-boss-chat-select");
    const chats = cachedData.chats;
    if (!select) {
      return;
    }

    if (!chats.length) {
      selectedChatId = "";
      select.innerHTML = '<option value="">No activity channels</option>';
      select.disabled = true;
      renderMessages();
      return;
    }

    if (
      !selectedChatId ||
      !chats.some(function (chat) {
        return chat.id === selectedChatId;
      })
    ) {
      const preferred = chats.find(function (chat) {
        return chat.hasUnread;
      });
      selectedChatId = (preferred || chats[0]).id;
    }

    select.disabled = false;
    select.innerHTML = chats
      .map(function (chat) {
        const selected = chat.id === selectedChatId ? " selected" : "";
        const unread = chat.hasUnread ? " • new" : "";
        return (
          '<option value="' +
          escapeHtml(chat.id) +
          '"' +
          selected +
          ">" +
          escapeHtml(chat.name || "Activity") +
          unread +
          "</option>"
        );
      })
      .join("");
    renderMessages();
  }

  function renderMessages() {
    if (!overlayElement || typeof overlayElement.querySelector !== "function") {
      return;
    }

    const messagesElement = overlayElement.querySelector("#wa-boss-comms-messages");
    const statusElement = overlayElement.querySelector("#wa-boss-comms-status");
    const input = overlayElement.querySelector("#wa-boss-comms-input");
    const messages = selectedChatId
      ? cachedData.messagesByChatId[selectedChatId] || []
      : [];

    if (statusElement) {
      statusElement.textContent = selectedChatId
        ? messages.length + " recent update" + (messages.length === 1 ? "" : "s")
        : "No synced activity";
    }
    if (input) {
      input.disabled = !selectedChatId;
      input.placeholder = selectedChatId
        ? "Reply to this activity…"
        : "No activity channel available";
    }
    if (!messagesElement) {
      return;
    }

    if (!messages.length) {
      messagesElement.innerHTML =
        '<div class="wa-boss-comms-empty">No recent entries in this activity channel.</div>';
      return;
    }

    messagesElement.innerHTML = messages
      .slice(-20)
      .map(function (message) {
        const outgoing =
          message.direction === "outgoing" || message.isOutgoing === true;
        const label = outgoing ? "You" : message.sender || "Update";
        const text = message.text || message.fallbackText || "Attachment";
        return (
          '<article class="wa-boss-message ' +
          (outgoing ? "is-outgoing" : "is-incoming") +
          '"><div><b>' +
          escapeHtml(label) +
          "</b><span>" +
          escapeHtml(message.timestampLabel || "") +
          "</span></div><p>" +
          escapeHtml(text) +
          "</p></article>"
        );
      })
      .join("");
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  async function sendReply() {
    if (!selectedChatId || !overlayElement) {
      return;
    }

    const input = overlayElement.querySelector("#wa-boss-comms-input");
    const button = overlayElement.querySelector('#wa-boss-comms-form button[type="submit"]');
    const status = overlayElement.querySelector("#wa-boss-comms-status");
    const text = input && input.value ? input.value.trim() : "";
    if (!text) {
      return;
    }

    const chat = cachedData.chats.find(function (item) {
      return item.id === selectedChatId;
    });
    if (!chat || typeof chrome === "undefined" || !chrome.runtime) {
      return;
    }

    input.disabled = true;
    if (button) button.disabled = true;
    if (status) status.textContent = "Sending update…";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "BOOKMARK_BAR_SEND",
        chatId: chat.id,
        chatName: chat.name,
        text: text
      });
      if (!response || response.ok !== true) {
        throw new Error("Unable to send");
      }

      input.value = "";
      cachedData = appendMessage(cachedData, chat.id, {
        id: "boss:" + Date.now() + ":" + text,
        text: text,
        direction: "outgoing",
        isOutgoing: true,
        sender: "",
        timestampLabel: "now",
        kind: "text",
        fallbackText: ""
      });
      cachedData.updatedAt = Date.now();
      renderMessages();
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [DATA_KEY]: cachedData });
      }
    } catch (error) {
      if (status) status.textContent = "Send failed — open WhatsApp Web and retry";
    } finally {
      input.disabled = false;
      if (button) button.disabled = false;
      input.focus();
    }
  }

  function subscribeToStorage() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.onChanged ||
      storageListener
    ) {
      return;
    }

    storageListener = function (changes, areaName) {
      if (
        areaName === "local" &&
        changes &&
        changes[DATA_KEY] &&
        isActive
      ) {
        cachedData = normalizeData(changes[DATA_KEY].newValue);
        renderChatData();
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
  }

  function unsubscribeFromStorage() {
    if (
      storageListener &&
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.onChanged &&
      typeof chrome.storage.onChanged.removeListener === "function"
    ) {
      chrome.storage.onChanged.removeListener(storageListener);
    }
    storageListener = null;
  }

  function applyTabCamouflage(theme) {
    const meta = TAB_META[theme] || TAB_META.spreadsheet;
    previousTitle = document.title;
    document.title = meta.title;
    previousIcons = [];
    createdIcon = null;

    const iconHref = createFavicon(meta);
    const icons =
      typeof document.querySelectorAll === "function"
        ? Array.from(document.querySelectorAll('link[rel~="icon"]'))
        : [];

    icons.forEach(function (icon) {
      previousIcons.push({
        element: icon,
        href: icon.getAttribute ? icon.getAttribute("href") : icon.href
      });
      setIconHref(icon, iconHref);
    });

    if (!icons.length && document.head && typeof document.head.appendChild === "function") {
      createdIcon = document.createElement("link");
      createdIcon.rel = "icon";
      setIconHref(createdIcon, iconHref);
      document.head.appendChild(createdIcon);
    }
  }

  function restoreTabCamouflage() {
    if (typeof document === "undefined") {
      return;
    }
    document.title = previousTitle;
    previousIcons.forEach(function (record) {
      setIconHref(record.element, record.href || "");
    });
    previousIcons = [];

    if (createdIcon && typeof createdIcon.remove === "function") {
      createdIcon.remove();
    }
    createdIcon = null;
  }

  function createFavicon(meta) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="10" fill="' +
      meta.color +
      '"/><text x="32" y="41" text-anchor="middle" font-family="Arial,sans-serif" font-size="' +
      (meta.glyph.length > 1 ? "22" : "36") +
      '" font-weight="700" fill="white">' +
      escapeHtml(meta.glyph) +
      "</text></svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function setIconHref(icon, href) {
    if (!icon) return;
    if (typeof icon.setAttribute === "function") {
      icon.setAttribute("href", href);
    } else {
      icon.href = href;
    }
  }

  function normalizeData(raw) {
    const api =
      typeof globalThis !== "undefined" && globalThis.WhatsAppBookmarkData;
    if (api && typeof api.normalizeBookmarkData === "function") {
      return api.normalizeBookmarkData(raw);
    }
    const source = raw || {};
    return {
      chats: Array.isArray(source.chats) ? source.chats.slice() : [],
      messagesByChatId:
        source.messagesByChatId && typeof source.messagesByChatId === "object"
          ? source.messagesByChatId
          : {},
      updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : 0,
      sourceTabAvailable: source.sourceTabAvailable === true
    };
  }

  function appendMessage(data, chatId, message) {
    const api =
      typeof globalThis !== "undefined" && globalThis.WhatsAppBookmarkData;
    if (api && typeof api.appendCachedMessage === "function") {
      return api.appendCachedMessage(data, chatId, message);
    }
    const next = normalizeData(data);
    const messages = Array.isArray(next.messagesByChatId[chatId])
      ? next.messagesByChatId[chatId].slice()
      : [];
    messages.push(message);
    next.messagesByChatId[chatId] = messages.slice(-20);
    return next;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    toggle,
    show,
    hide,
    getActive,
    THEMES
  };
});
