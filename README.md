<p align="center">
  <img src="icons/chatveil-128.png" alt="ChatVeil icon" width="128" height="128" />
</p>

# ChatVeil

[English](#english) | [繁體中文](#traditional-chinese) | [简体中文](#simplified-chinese)

---

<a id="english"></a>

## English

**ChatVeil** is a Manifest V3 Chrome extension for selectively blurring WhatsApp Web, hiding sensitive UI in plain sight, and deploying a small arsenal of camouflage tools when screen sharing turns into a stealth mission.

It is built with plain JavaScript and CSS. There is no build step, no bundler, and no remote API. Chrome loads this repository directly as an unpacked extension.

### Why It Exists

WhatsApp Web leaks a lot of visual context even when you are trying to stay focused: contact names, previews, avatars, unread state, media thumbnails, timestamps, receipts, and the general fact that "yes, you are definitely chatting right now."

ChatVeil turns that chaos into a configurable privacy field.

### Feature Matrix

#### Privacy Layer

- Per-target blur controls for contact list names, chat text, avatars, preview text, media cards, documents, timestamps, read receipts, and more.
- Quick presets: `work`, `presentation`, `private`, and `minimal`.
- Reveal controls: reveal on hover, hold `Alt` to reveal, temporary reveal, and idle/away blur behavior.
- Emergency hide for instantly re-veiling everything using the configured reveal duration.
- Cinematic blur styles: `scanline`, `matrix`, and `noise`.
- Local read receipt masking for hiding receipt indicators on your screen without changing WhatsApp's actual server-side behavior.

#### Camouflage Layer

- Bookmark Bar Chat that disguises cached chats as a browser bookmark bar on WhatsApp Web and regular websites.
- Contact presentation controls including aliases, pinned contacts, groups, themes, and custom bar color.
- Cached chat panel with recent messages, media previews, image zoom, emoji picker, and relay send controls when a WhatsApp tab is available.
- Keep WhatsApp Web alive mode using alarms and a minimized WhatsApp window so the bookmark cache can keep syncing.
- Boss Key overlay with spreadsheet, VS Code, and terminal-style camouflage themes.
- Fake Meeting overlay for Google Calendar, Zoom, or Outlook-style meeting cover screens.
- Corner Cat desktop pet with quiet, reactive, interactive, and hybrid modes.

#### Activity Layer

- Popup dashboard with cached message counts, active chats, top contact, and top emoji summaries.
- Danmu mode for rendering incoming cached messages as scrolling overlay comments on non-WhatsApp pages.
- Morse notifications that flash the extension badge using the incoming contact name, with optional filtering.

### Install

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select this repository folder.
5. Open `https://web.whatsapp.com` and sign in.

After changing source files, reload the extension from `chrome://extensions` and refresh any open WhatsApp Web tabs.

### Keyboard Shortcuts

Chrome exposes extension shortcuts at `chrome://extensions/shortcuts`, where they can be customized.

- Toggle bookmark bar chat: `Ctrl+Shift+9` or `Command+Shift+9` on macOS
- Temporary reveal: `Ctrl+Shift+8` or `Command+Shift+8` on macOS
- Toggle boss key overlay: `Ctrl+Shift+0` or `Command+Shift+0` on macOS

### Development

Run the full test suite with:

```bash
npm test
```

Tests use Node's built-in test runner and cover manifest wiring, popup behavior, settings normalization, selectors, runtime helpers, background relay behavior, bookmark caching, privacy controls, and desktop pet behavior.

### Data, Permissions, and Boundaries

- Data is stored locally in `chrome.storage.local`.
- No external API is called by the extension.
- Messages sent from disguise surfaces are relayed to an open WhatsApp Web tab and still sent by WhatsApp Web itself.
- `storage` and `unlimitedStorage` are used for settings, cached chat data, incoming events, and dashboard summaries.
- `tabs` and `scripting` are used to find WhatsApp tabs and inject bookmark support when needed.
- `alarms` is used for keep-alive sync behavior.

### Repository Notes

- This project is currently intended to be loaded as an unpacked extension.
- The codebase is plain JavaScript and CSS by design.
- If you use it in a work or public environment, make sure your usage complies with your local policy, workplace rules, and privacy expectations.

---

<a id="traditional-chinese"></a>

## 繁體中文

**ChatVeil** 是一個基於 Manifest V3 的 Chrome 擴充功能，專門用來選擇性模糊 WhatsApp Web、把敏感介面藏在視線死角，並在螢幕分享或公開場合時啟動一整套偽裝機制。

它使用原生 JavaScript 與 CSS 撰寫，沒有 build step、沒有 bundler，也不依賴遠端 API。Chrome 可以直接把這個 repo 當成 unpacked extension 載入。

### 為什麼會有這個專案

WhatsApp Web 洩漏的畫面資訊其實很多：聯絡人名稱、預覽文字、頭像、未讀狀態、媒體縮圖、時間戳、已讀符號，甚至只是讓旁人一眼看出「你現在就在聊天」。

ChatVeil 的目標，就是把這些視覺洩漏變成一層可配置的隱私結界。

### 功能矩陣

#### 隱私層

- 可對多種目標獨立控制模糊：聯絡人清單名稱、聊天文字、頭像、預覽文字、媒體卡片、文件、時間戳、已讀回條等。
- 內建快速預設：`work`、`presentation`、`private`、`minimal`。
- 提供多種顯示控制：滑鼠懸停顯示、按住 `Alt` 顯示、暫時顯示、閒置／離開自動模糊。
- 緊急隱藏模式可依照設定的顯示時長，瞬間重新覆蓋所有敏感區域。
- 支援 `scanline`、`matrix`、`noise` 三種電影感模糊風格。
- 本地已讀回條遮罩只會隱藏你畫面上的回條圖示，不會改變 WhatsApp 真正的伺服器端行為。

#### 偽裝層

- Bookmark Bar Chat 可把快取聊天偽裝成瀏覽器書籤列，出現在 WhatsApp Web 與一般網站上。
- 支援聯絡人別名、置頂、分組、主題與自訂色等展示控制。
- 快取聊天面板支援最近訊息、媒體預覽、圖片放大、emoji picker，以及在有 WhatsApp 分頁時的訊息轉送發送。
- Keep WhatsApp Web alive 模式會搭配 alarm 與最小化視窗維持同步，讓書籤列聊天快取持續更新。
- Boss Key 可把 WhatsApp 偽裝成試算表、VS Code 或終端機風格畫面。
- Fake Meeting 可生成 Google Calendar、Zoom、Outlook 風格的會議掩護畫面。
- Corner Cat 是可選的桌面角落寵物，提供 quiet、reactive、interactive、hybrid 模式。

#### 活動層

- Popup dashboard 會整理快取訊息數、活躍聊天、最常出現的聯絡人與 emoji。
- Danmu mode 可在非 WhatsApp 頁面把新進訊息以滾動彈幕方式顯示。
- Morse notifications 會把 incoming contact name 轉成 badge 閃爍訊號，也可加上精準聯絡人篩選。

### 安裝方式

1. 打開 `chrome://extensions`
2. 開啟 Developer mode
3. 點擊 `Load unpacked`
4. 選取這個 repo 資料夾
5. 開啟 `https://web.whatsapp.com` 並登入

修改原始碼後，請到 `chrome://extensions` 重新載入擴充功能，並刷新已開啟的 WhatsApp Web 分頁。

### 快捷鍵

Chrome 會在 `chrome://extensions/shortcuts` 顯示這些快捷鍵，也可以在那裡自行修改。

- 切換 bookmark bar chat：`Ctrl+Shift+9`，macOS 為 `Command+Shift+9`
- 暫時顯示模糊內容：`Ctrl+Shift+8`，macOS 為 `Command+Shift+8`
- 切換 boss key 偽裝層：`Ctrl+Shift+0`，macOS 為 `Command+Shift+0`

### 開發與測試

執行完整測試：

```bash
npm test
```

測試使用 Node 內建 test runner，覆蓋 manifest 設定、popup 行為、settings normalization、selectors、runtime helpers、background relay、bookmark cache、隱私控制與桌面寵物行為。

### 資料、權限與邊界

- 所有資料都儲存在本機 `chrome.storage.local`
- 擴充功能不會呼叫外部 API
- 從偽裝介面送出的訊息，本質上仍是透過已開啟的 WhatsApp Web 分頁發送
- `storage` 與 `unlimitedStorage` 用於設定、聊天快取、incoming event 與 dashboard 摘要
- `tabs` 與 `scripting` 用於尋找 WhatsApp 分頁，並在需要時注入 bookmark 相關支援
- `alarms` 用於 keep-alive 同步機制

### Repo 備註

- 目前這個專案是以 unpacked extension 的方式使用。
- 整個程式碼刻意維持在原生 JavaScript 與 CSS。
- 如果你要在工作、直播、教學或公共環境使用，請自行確認是否符合當地規範、公司政策與隱私期待。

---

<a id="simplified-chinese"></a>

## 简体中文

**ChatVeil** 是一个基于 Manifest V3 的 Chrome 扩展，专门用于选择性模糊 WhatsApp Web、把敏感界面藏进视觉死角，并在屏幕共享或公共场合时启动一整套伪装机制。

它使用原生 JavaScript 与 CSS 编写，没有 build step、没有 bundler，也不依赖远程 API。Chrome 可以直接把这个 repo 当作 unpacked extension 载入。

### 为什么会有这个项目

WhatsApp Web 会泄漏很多画面信息：联系人名称、预览文字、头像、未读状态、媒体缩略图、时间戳、已读标记，甚至只是让旁人一眼看出“你现在就在聊天”。

ChatVeil 的目标，就是把这些视觉泄漏变成一层可配置的隐私结界。

### 功能矩阵

#### 隐私层

- 可对多种目标独立控制模糊：联系人列表名称、聊天文字、头像、预览文字、媒体卡片、文件、时间戳、已读回执等。
- 内建快速预设：`work`、`presentation`、`private`、`minimal`。
- 提供多种显示控制：悬停显示、按住 `Alt` 显示、临时显示、闲置／离开自动模糊。
- 紧急隐藏模式可按配置的显示时长，瞬间重新覆盖所有敏感区域。
- 支持 `scanline`、`matrix`、`noise` 三种电影感模糊风格。
- 本地已读回执遮罩只会隐藏你屏幕上的回执图标，不会改变 WhatsApp 真正的服务端行为。

#### 伪装层

- Bookmark Bar Chat 可把缓存聊天伪装成浏览器书签栏，显示在 WhatsApp Web 与普通网站上。
- 支持联系人别名、置顶、分组、主题与自定义颜色等展示控制。
- 缓存聊天面板支持最近消息、媒体预览、图片放大、emoji picker，以及在有 WhatsApp 标签页时的消息转发送出。
- Keep WhatsApp Web alive 模式会结合 alarm 与最小化窗口维持同步，让书签栏聊天缓存持续更新。
- Boss Key 可把 WhatsApp 伪装成电子表格、VS Code 或终端风格界面。
- Fake Meeting 可生成 Google Calendar、Zoom、Outlook 风格的会议掩护画面。
- Corner Cat 是可选的桌面角落宠物，提供 quiet、reactive、interactive、hybrid 模式。

#### 活动层

- Popup dashboard 会汇总缓存消息数、活跃聊天、最高频联系人与 emoji。
- Danmu mode 可在非 WhatsApp 页面把新消息以滚动弹幕形式显示出来。
- Morse notifications 会把 incoming contact name 转成 badge 闪烁信号，也可以附加精确联系人过滤。

### 安装方式

1. 打开 `chrome://extensions`
2. 开启 Developer mode
3. 点击 `Load unpacked`
4. 选择这个 repo 文件夹
5. 打开 `https://web.whatsapp.com` 并登录

修改源码后，请到 `chrome://extensions` 重新载入扩展，并刷新已经打开的 WhatsApp Web 标签页。

### 快捷键

Chrome 会在 `chrome://extensions/shortcuts` 显示这些快捷键，也可以在那里自行修改。

- 切换 bookmark bar chat：`Ctrl+Shift+9`，macOS 为 `Command+Shift+9`
- 临时显示模糊内容：`Ctrl+Shift+8`，macOS 为 `Command+Shift+8`
- 切换 boss key 伪装层：`Ctrl+Shift+0`，macOS 为 `Command+Shift+0`

### 开发与测试

运行完整测试：

```bash
npm test
```

测试使用 Node 内建 test runner，覆盖 manifest 配置、popup 行为、settings normalization、selectors、runtime helpers、background relay、bookmark cache、隐私控制与桌面宠物行为。

### 数据、权限与边界

- 所有数据都存储在本地 `chrome.storage.local`
- 扩展不会调用外部 API
- 从伪装界面发送的消息，本质上仍然是通过已打开的 WhatsApp Web 标签页发出
- `storage` 与 `unlimitedStorage` 用于设置、聊天缓存、incoming event 与 dashboard 摘要
- `tabs` 与 `scripting` 用于寻找 WhatsApp 标签页，并在需要时注入 bookmark 相关支持
- `alarms` 用于 keep-alive 同步机制

### Repo 备注

- 目前这个项目主要以 unpacked extension 方式使用。
- 整个代码库刻意保持为原生 JavaScript 与 CSS。
- 如果你要在工作、直播、教学或公共环境使用，请自行确认是否符合当地规范、公司政策与隐私预期。
