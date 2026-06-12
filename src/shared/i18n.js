(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurI18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_LANGUAGE = "en";
  const LANGUAGE_ORDER = Object.freeze(["en", "zh-Hant", "zh-Hans"]);
  const LANGUAGE_META = Object.freeze({
    en: Object.freeze({
      label: "English",
      htmlLang: "en"
    }),
    "zh-Hant": Object.freeze({
      label: "繁體中文",
      htmlLang: "zh-Hant"
    }),
    "zh-Hans": Object.freeze({
      label: "简体中文",
      htmlLang: "zh-Hans"
    })
  });

  const MESSAGES = Object.freeze({
    en: Object.freeze({
      app: Object.freeze({
        title: "ChatVeil",
        description: "Control which WhatsApp Web regions stay blurred."
      }),
      language: Object.freeze({
        label: "Language"
      }),
      section: Object.freeze({
        privacyBlur: "Privacy Blur",
        quickModes: "Quick modes",
        cinematicBlur: "Cinematic Blur",
        bossKey: "Boss Key",
        cornerCat: "Corner Cat",
        receiptPrivacy: "Receipt Indicator Privacy",
        dashboard: "Dashboard",
        danmu: "Danmu Mode",
        morse: "Morse Notifications",
        fakeMeeting: "Fake Meeting",
        bookmarkBar: "Bookmark Bar Chat",
        blurTargets: "Blur targets"
      }),
      field: Object.freeze({
        preset: "Preset",
        style: "Style",
        theme: "Theme",
        mode: "Mode",
        corner: "Corner",
        size: "Size",
        color: "Color",
        speed: "Speed",
        template: "Template"
      }),
      toggle: Object.freeze({
        enabled: "Enable privacy blur",
        hover: "Reveal on hover",
        holdAlt: "Hold Alt to reveal",
        idleBlur: "Blur when idle or away"
      }),
      idle: Object.freeze({
        blurAfter: "Blur after",
        fiveSeconds: "5 seconds",
        tenSeconds: "10 seconds",
        thirtySeconds: "30 seconds",
        oneMinute: "1 minute"
      }),
      cinematic: Object.freeze({
        enabled: "Enable cinematic blur",
        scanline: "Scanline",
        matrix: "Matrix",
        noise: "Noise"
      }),
      boss: Object.freeze({
        enabled: "Enable boss key",
        spreadsheet: "Spreadsheet",
        vscode: "VS Code",
        terminal: "Terminal"
      }),
      desktopPet: Object.freeze({
        enabled: "Enable Corner Cat",
        hidden: "Hidden state by default",
        quiet: "Quiet",
        reactive: "Reactive",
        interactive: "Interactive",
        hybrid: "Hybrid",
        bottomRight: "Bottom Right",
        bottomLeft: "Bottom Left",
        topRight: "Top Right",
        topLeft: "Top Left",
        small: "Small",
        medium: "Medium",
        large: "Large"
      }),
      receipt: Object.freeze({
        hideOutgoing: "Hide outgoing receipt icons locally",
        note: "This only hides the icons on your screen. It does not stop WhatsApp from sending read receipts."
      }),
      dashboard: Object.freeze({
        enabled: "Enable message dashboard",
        cachedMessages: "Cached messages",
        activeChats: "Active chats",
        topContact: "Top contact",
        topEmoji: "Top emoji"
      }),
      danmu: Object.freeze({
        enabled: "Enable danmu mode",
        slow: "Slow",
        normal: "Normal",
        fast: "Fast"
      }),
      morse: Object.freeze({
        enabled: "Enable morse notifications",
        contactFilter: "Contact filter",
        contactPlaceholder: "Enter contact name"
      }),
      fakeMeeting: Object.freeze({
        enabled: "Enable fake meeting overlay",
        calendar: "Google Calendar",
        zoom: "Zoom",
        outlook: "Outlook"
      }),
      bookmark: Object.freeze({
        description: "Disguise WhatsApp conversations as a browser bookmark bar on every page.",
        enabled: "Enable bookmark bar chat",
        keepAlive: "Keep WhatsApp Web alive",
        keepAliveNote: "Opens a hidden WhatsApp Web tab so messages sync in the background.",
        alwaysShowContacts: "Always show contacts",
        pinnedContactsPlaceholder: "Enter names, one per line",
        pinnedContactsNote: "These names will always appear in the bookmark bar.",
        aliases: "Contact aliases",
        aliasesPlaceholder: "Alice => Client A",
        aliasesNote: "Replace chat names in the bookmark bar without changing the real conversation.",
        groups: "Contact groups",
        groupsPlaceholder: "Work: Alice, Bob",
        groupsNote: "Group chats into visible clusters inside the bookmark bar.",
        barColor: "Bar color"
      }),
      action: Object.freeze({
        hideEverythingForSeconds: "Hide everything for {seconds} seconds",
        testBossKey: "Test boss key",
        preview: "Preview",
        testMorse: "Test morse",
        generateFakeMeeting: "Generate fake meeting",
        restore: "Restore last saved settings",
        showAll: "Show everything",
        showAllForSeconds: "Show everything for {seconds} seconds"
      }),
      temporary: Object.freeze({
        reveal: "Temporary reveal",
        seconds: "seconds"
      }),
      shortcut: Object.freeze({
        note: "Hotkeys can be changed in Chrome's extension shortcuts page."
      }),
      preset: Object.freeze({
        custom: "Custom",
        work: "Work",
        presentation: "Presentation",
        private: "Private",
        minimal: "Minimal"
      }),
      theme: Object.freeze({
        classic: "Classic",
        sunset: "Sunset",
        midnight: "Midnight",
        paper: "Paper"
      }),
      target: Object.freeze({
        contactList: "Contact list",
        chatText: "Chat message text",
        avatars: "Avatars",
        previewText: "Preview text",
        mediaPreviews: "Media previews and documents",
        voiceMessages: "Voice message cards",
        timestamps: "Timestamps & read receipts",
        otherUi: "Other WhatsApp Web UI"
      })
    }),
    "zh-Hant": Object.freeze({
      app: Object.freeze({
        title: "ChatVeil",
        description: "控制 WhatsApp Web 哪些區域保持模糊。"
      }),
      language: Object.freeze({
        label: "語言"
      }),
      section: Object.freeze({
        privacyBlur: "隱私模糊",
        quickModes: "快速模式",
        cinematicBlur: "電影感模糊",
        bossKey: "老闆鍵",
        cornerCat: "角落貓",
        receiptPrivacy: "已讀標記隱私",
        dashboard: "儀表板",
        danmu: "彈幕模式",
        morse: "摩斯通知",
        fakeMeeting: "偽裝會議",
        bookmarkBar: "書籤列聊天",
        blurTargets: "模糊目標"
      }),
      field: Object.freeze({
        preset: "預設",
        style: "樣式",
        theme: "主題",
        mode: "模式",
        corner: "角落",
        size: "大小",
        color: "顏色",
        speed: "速度",
        template: "範本"
      }),
      toggle: Object.freeze({
        enabled: "啟用隱私模糊",
        hover: "滑過時顯示",
        holdAlt: "按住 Alt 顯示",
        idleBlur: "閒置或離開時模糊"
      }),
      idle: Object.freeze({
        blurAfter: "模糊延遲",
        fiveSeconds: "5 秒",
        tenSeconds: "10 秒",
        thirtySeconds: "30 秒",
        oneMinute: "1 分鐘"
      }),
      cinematic: Object.freeze({
        enabled: "啟用電影感模糊",
        scanline: "掃描線",
        matrix: "矩陣",
        noise: "雜訊"
      }),
      boss: Object.freeze({
        enabled: "啟用老闆鍵",
        spreadsheet: "試算表",
        vscode: "VS Code",
        terminal: "終端機"
      }),
      desktopPet: Object.freeze({
        enabled: "啟用角落貓",
        hidden: "預設隱藏狀態",
        quiet: "安靜",
        reactive: "反應",
        interactive: "互動",
        hybrid: "混合",
        bottomRight: "右下",
        bottomLeft: "左下",
        topRight: "右上",
        topLeft: "左上",
        small: "小",
        medium: "中",
        large: "大"
      }),
      receipt: Object.freeze({
        hideOutgoing: "在本機隱藏傳出訊息回執圖示",
        note: "這只會隱藏你螢幕上的圖示，不會阻止 WhatsApp 傳送已讀回執。"
      }),
      dashboard: Object.freeze({
        enabled: "啟用訊息儀表板",
        cachedMessages: "快取訊息",
        activeChats: "活躍聊天",
        topContact: "最常聯絡人",
        topEmoji: "最常表情"
      }),
      danmu: Object.freeze({
        enabled: "啟用彈幕模式",
        slow: "慢",
        normal: "正常",
        fast: "快"
      }),
      morse: Object.freeze({
        enabled: "啟用摩斯通知",
        contactFilter: "聯絡人篩選",
        contactPlaceholder: "輸入聯絡人名稱"
      }),
      fakeMeeting: Object.freeze({
        enabled: "啟用偽裝會議覆蓋層",
        calendar: "Google 日曆",
        zoom: "Zoom",
        outlook: "Outlook"
      }),
      bookmark: Object.freeze({
        description: "把 WhatsApp 對話偽裝成每個頁面上的瀏覽器書籤列。",
        enabled: "啟用書籤列聊天",
        keepAlive: "保持 WhatsApp Web 在線",
        keepAliveNote: "開啟隱藏的 WhatsApp Web 分頁，讓訊息在背景同步。",
        alwaysShowContacts: "永遠顯示聯絡人",
        pinnedContactsPlaceholder: "輸入名稱，每行一個",
        pinnedContactsNote: "這些名稱會永遠顯示在書籤列。",
        aliases: "聯絡人別名",
        aliasesPlaceholder: "Alice => 客戶 A",
        aliasesNote: "替換書籤列中的聊天名稱，不改變真實對話。",
        groups: "聯絡人群組",
        groupsPlaceholder: "工作: Alice, Bob",
        groupsNote: "將聊天分組成書籤列中的可見群集。",
        barColor: "書籤列顏色"
      }),
      action: Object.freeze({
        hideEverythingForSeconds: "隱藏全部 {seconds} 秒",
        testBossKey: "測試老闆鍵",
        preview: "預覽",
        testMorse: "測試摩斯",
        generateFakeMeeting: "產生偽裝會議",
        restore: "還原上次儲存的設定",
        showAll: "顯示全部",
        showAllForSeconds: "顯示全部 {seconds} 秒"
      }),
      temporary: Object.freeze({
        reveal: "暫時顯示",
        seconds: "秒"
      }),
      shortcut: Object.freeze({
        note: "快捷鍵可在 Chrome 擴充功能快捷鍵頁面變更。"
      }),
      preset: Object.freeze({
        custom: "自訂",
        work: "工作",
        presentation: "簡報",
        private: "私人",
        minimal: "最小"
      }),
      theme: Object.freeze({
        classic: "經典",
        sunset: "夕陽",
        midnight: "午夜",
        paper: "紙張"
      }),
      target: Object.freeze({
        contactList: "聯絡人列表",
        chatText: "聊天訊息文字",
        avatars: "頭像",
        previewText: "預覽文字",
        mediaPreviews: "媒體預覽和文件",
        voiceMessages: "語音訊息卡片",
        timestamps: "時間戳和已讀回執",
        otherUi: "其他 WhatsApp Web 介面"
      })
    }),
    "zh-Hans": Object.freeze({
      app: Object.freeze({
        title: "ChatVeil",
        description: "控制 WhatsApp Web 哪些区域保持模糊。"
      }),
      language: Object.freeze({
        label: "语言"
      }),
      section: Object.freeze({
        privacyBlur: "隐私模糊",
        quickModes: "快速模式",
        cinematicBlur: "电影感模糊",
        bossKey: "老板键",
        cornerCat: "角落猫",
        receiptPrivacy: "已读标记隐私",
        dashboard: "仪表板",
        danmu: "弹幕模式",
        morse: "摩斯通知",
        fakeMeeting: "伪装会议",
        bookmarkBar: "书签栏聊天",
        blurTargets: "模糊目标"
      }),
      field: Object.freeze({
        preset: "预设",
        style: "样式",
        theme: "主题",
        mode: "模式",
        corner: "角落",
        size: "大小",
        color: "颜色",
        speed: "速度",
        template: "模板"
      }),
      toggle: Object.freeze({
        enabled: "启用隐私模糊",
        hover: "悬停时显示",
        holdAlt: "按住 Alt 显示",
        idleBlur: "闲置或离开时模糊"
      }),
      idle: Object.freeze({
        blurAfter: "模糊延迟",
        fiveSeconds: "5 秒",
        tenSeconds: "10 秒",
        thirtySeconds: "30 秒",
        oneMinute: "1 分钟"
      }),
      cinematic: Object.freeze({
        enabled: "启用电影感模糊",
        scanline: "扫描线",
        matrix: "矩阵",
        noise: "噪声"
      }),
      boss: Object.freeze({
        enabled: "启用老板键",
        spreadsheet: "电子表格",
        vscode: "VS Code",
        terminal: "终端"
      }),
      desktopPet: Object.freeze({
        enabled: "启用角落猫",
        hidden: "默认隐藏状态",
        quiet: "安静",
        reactive: "反应",
        interactive: "互动",
        hybrid: "混合",
        bottomRight: "右下",
        bottomLeft: "左下",
        topRight: "右上",
        topLeft: "左上",
        small: "小",
        medium: "中",
        large: "大"
      }),
      receipt: Object.freeze({
        hideOutgoing: "在本机隐藏传出消息回执图标",
        note: "这只会隐藏你屏幕上的图标，不会阻止 WhatsApp 发送已读回执。"
      }),
      dashboard: Object.freeze({
        enabled: "启用消息仪表板",
        cachedMessages: "缓存消息",
        activeChats: "活跃聊天",
        topContact: "最常联系人",
        topEmoji: "最常表情"
      }),
      danmu: Object.freeze({
        enabled: "启用弹幕模式",
        slow: "慢",
        normal: "正常",
        fast: "快"
      }),
      morse: Object.freeze({
        enabled: "启用摩斯通知",
        contactFilter: "联系人筛选",
        contactPlaceholder: "输入联系人名称"
      }),
      fakeMeeting: Object.freeze({
        enabled: "启用伪装会议覆盖层",
        calendar: "Google 日历",
        zoom: "Zoom",
        outlook: "Outlook"
      }),
      bookmark: Object.freeze({
        description: "把 WhatsApp 对话伪装成每个页面上的浏览器书签栏。",
        enabled: "启用书签栏聊天",
        keepAlive: "保持 WhatsApp Web 在线",
        keepAliveNote: "打开隐藏的 WhatsApp Web 标签页，让消息在后台同步。",
        alwaysShowContacts: "始终显示联系人",
        pinnedContactsPlaceholder: "输入名称，每行一个",
        pinnedContactsNote: "这些名称会始终显示在书签栏。",
        aliases: "联系人别名",
        aliasesPlaceholder: "Alice => 客户 A",
        aliasesNote: "替换书签栏中的聊天名称，不改变真实对话。",
        groups: "联系人分组",
        groupsPlaceholder: "工作: Alice, Bob",
        groupsNote: "将聊天分组成书签栏中的可见群组。",
        barColor: "书签栏颜色"
      }),
      action: Object.freeze({
        hideEverythingForSeconds: "隐藏全部 {seconds} 秒",
        testBossKey: "测试老板键",
        preview: "预览",
        testMorse: "测试摩斯",
        generateFakeMeeting: "生成伪装会议",
        restore: "还原上次保存的设置",
        showAll: "显示全部",
        showAllForSeconds: "显示全部 {seconds} 秒"
      }),
      temporary: Object.freeze({
        reveal: "临时显示",
        seconds: "秒"
      }),
      shortcut: Object.freeze({
        note: "快捷键可在 Chrome 扩展程序快捷键页面更改。"
      }),
      preset: Object.freeze({
        custom: "自定义",
        work: "工作",
        presentation: "演示",
        private: "私人",
        minimal: "最小"
      }),
      theme: Object.freeze({
        classic: "经典",
        sunset: "夕阳",
        midnight: "午夜",
        paper: "纸张"
      }),
      target: Object.freeze({
        contactList: "联系人列表",
        chatText: "聊天消息文字",
        avatars: "头像",
        previewText: "预览文字",
        mediaPreviews: "媒体预览和文档",
        voiceMessages: "语音消息卡片",
        timestamps: "时间戳和已读回执",
        otherUi: "其他 WhatsApp Web 界面"
      })
    })
  });

  function normalizeLanguage(language) {
    return LANGUAGE_ORDER.includes(language) ? language : DEFAULT_LANGUAGE;
  }

  function getMessage(language, key, replacements) {
    const normalizedLanguage = normalizeLanguage(language);
    const localized = lookupMessage(MESSAGES[normalizedLanguage], key);
    const fallback = lookupMessage(MESSAGES[DEFAULT_LANGUAGE], key);
    const template = typeof localized === "string"
      ? localized
      : typeof fallback === "string"
        ? fallback
        : key;

    return interpolate(template, replacements);
  }

  function lookupMessage(messages, key) {
    if (!messages || typeof key !== "string") {
      return undefined;
    }

    return key.split(".").reduce(function (current, part) {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      return current[part];
    }, messages);
  }

  function interpolate(template, replacements) {
    if (!replacements || typeof replacements !== "object") {
      return template;
    }

    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(replacements, name)
        ? String(replacements[name])
        : match;
    });
  }

  return {
    DEFAULT_LANGUAGE,
    LANGUAGE_ORDER,
    LANGUAGE_META,
    MESSAGES,
    normalizeLanguage,
    getMessage
  };
});
