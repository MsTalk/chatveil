const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const bookmarkBarSource = fs.readFileSync(
  path.join(__dirname, "..", "src/content/bookmark-bar.js"),
  "utf8"
);
const settingsApi = require("../src/shared/settings.js");

test("bookmark bar extracts chats from title selectors even when row selectors do not match directly", async () => {
  const storageSets = [];
  const titleNode = createNode({
    textContent: "Alice",
    selectors: ['[data-testid="cell-frame-title"]']
  });
  const previewNode = createNode({
    textContent: "Latest message",
    attrs: { "data-testid": "cell-frame-secondary" }
  });
  const avatarNode = createNode({
    tagName: "img",
    src: "https://example.com/avatar.png"
  });
  const containerNode = createNode({
    selectors: ['[data-testid="cell-frame-container"]'],
    attrs: { "data-testid": "chat-alice" },
    children: [titleNode, previewNode, avatarNode]
  });

  const document = createDocument({
    selectorMap: {
      '#pane-side [data-testid="cell-frame-title"], #pane-side [data-testid="cell-frame-title"] span[dir="auto"]': [
        titleNode
      ]
    }
  });
  document.body.appendChild(containerNode);

  const context = vm.createContext({
    chrome: {
      storage: {
        local: {
          async get(key) {
            if (key === "waPrivacyBlurSettings") {
              return {
                waPrivacyBlurSettings: {
                  bookmarkBarEnabled: true
                }
              };
            }

            return {};
          },
          async set(value) {
            storageSets.push(value);
          }
        },
        onChanged: {
          addListener() {}
        }
      },
      runtime: {
        onMessage: {
          addListener() {}
        }
      }
    },
    document,
    location: { hostname: "web.whatsapp.com" },
    window: null,
    setInterval() {
      return 1;
    },
    clearInterval() {},
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
    MouseEvent: function MouseEvent(type, init) {
      this.type = type;
      Object.assign(this, init);
    },
    InputEvent: function InputEvent(type, init) {
      this.type = type;
      Object.assign(this, init);
    },
    KeyboardEvent: function KeyboardEvent(type, init) {
      this.type = type;
      Object.assign(this, init);
    },
    CSS: {
      escape(value) {
        return value;
      }
    },
    console
  });
  context.window = context;
  context.globalThis = context;

  vm.runInContext(bookmarkBarSource, context, { filename: "bookmark-bar.js" });

  await flushAsync();

  assert.equal(storageSets.length > 0, true);
  assert.deepEqual(JSON.parse(JSON.stringify(storageSets[0])), {
    waBookmarkBarData: {
      chats: [
        {
          id: "chat-alice",
          name: "Alice",
          preview: "Latest message",
          avatar: "https://example.com/avatar.png",
          hasUnread: false,
          isPinned: false
        }
      ],
      messagesByChatId: {},
      updatedAt: storageSets[0].waBookmarkBarData.updatedAt,
      sourceTabAvailable: true
    }
  });
  assert.equal(typeof storageSets[0].waBookmarkBarData.updatedAt, "number");
});

test("bookmark bar excludes unread accessibility text from chat names", async () => {
  const storageSets = [];
  const nameNode = createNode({
    tagName: "span",
    textContent: "皮皮",
    attrs: { dir: "auto", title: "皮皮" }
  });
  const titleNode = createNode({
    textContent: "1 条未读消息",
    selectors: ['[data-testid="cell-frame-title"]'],
    children: [nameNode]
  });
  const containerNode = createNode({
    selectors: ['[data-testid="cell-frame-container"]'],
    attrs: { "data-testid": "chat-pipi" },
    children: [titleNode]
  });
  const document = createDocument({
    selectorMap: {
      '#pane-side [data-testid="cell-frame-title"], #pane-side [data-testid="cell-frame-title"] span[dir="auto"]': [
        titleNode,
        nameNode
      ]
    }
  });
  document.body.appendChild(containerNode);

  const context = vm.createContext({
    chrome: {
      storage: {
        local: {
          async get() {
            return {
              waPrivacyBlurSettings: {
                bookmarkBarEnabled: true
              }
            };
          },
          async set(value) {
            storageSets.push(value);
          }
        },
        onChanged: {
          addListener() {}
        }
      },
      runtime: {
        onMessage: {
          addListener() {}
        }
      }
    },
    document,
    location: { hostname: "web.whatsapp.com" },
    window: null,
    setInterval() {
      return 1;
    },
    clearInterval() {},
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
    console
  });
  context.window = context;
  context.globalThis = context;

  vm.runInContext(bookmarkBarSource, context, { filename: "bookmark-bar.js" });
  await flushAsync();

  assert.equal(storageSets.at(-1).waBookmarkBarData.chats[0].name, "皮皮");
});

test("bookmark bar detects Chinese unread accessibility labels", async () => {
  const storageSets = [];
  const { context, document } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-pipi",
        ariaLabel: "皮皮, 2 未讀消息",
        name: "皮皮",
        preview: "新消息"
      }
    ],
    bookmarkSettings: {
      bookmarkBarEnabled: true
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.equal(latestWrite.waBookmarkBarData.chats[0].hasUnread, true);

  const item = document.querySelector('[data-chat-id="chat-pipi"]');
  assert.ok(item, "expected unread chat to render in bookmark bar");
  assert.equal(item.getAttribute("data-has-unread"), "true");
  assert.ok(
    item.querySelector(".wa-bookmark-bar__unread-dot"),
    "expected a visible unread marker on the bookmark item"
  );
});

test("bookmark bar uses distinct chat ids when rows share a generic data-testid", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "cell-frame-container",
        ariaLabel: "chat-alice",
        name: "Alice",
        preview: "Hello"
      },
      {
        id: "cell-frame-container",
        ariaLabel: "chat-bob",
        name: "Bob",
        preview: "Hi"
      }
    ]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.deepEqual(
    latestWrite.waBookmarkBarData.chats.map((chat) => chat.id),
    ["chat-alice", "chat-bob"]
  );
});

test("WhatsApp page persists recent messages for the active bookmark chat", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        avatar: "https://example.com/avatar.png",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: createMainPanelMessages([
      { text: "hello", outgoing: false, time: "10:15" },
      { text: "see you", outgoing: true, time: "10:16" }
    ])
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.deepEqual(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"].map((entry) => ({
      text: entry.text,
      direction: entry.direction,
      timestampLabel: entry.timestampLabel
    })),
    [
      { text: "hello", direction: "incoming", timestampLabel: "10:15" },
      { text: "see you", direction: "outgoing", timestampLabel: "10:16" }
    ]
  );
});

test("WhatsApp page emits incoming message events when cached messages gain incoming entries", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    bookmarkData: {
      chats: [{ id: "chat-alice", name: "Alice", preview: "old", avatar: null }],
      messagesByChatId: {
        "chat-alice": [
          { id: "message-0", text: "old", direction: "incoming", timestampLabel: "10:10" }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: true
    },
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "new",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: createMainPanelMessages([
      { text: "old", outgoing: false, time: "10:10" },
      { text: "new incoming", outgoing: false, time: "10:11" }
    ])
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  const eventWrite = storageSets.find((write) => write.waIncomingMessageEvents);
  assert.ok(eventWrite, "expected an incoming message event batch");
  assert.deepEqual(
    eventWrite.waIncomingMessageEvents.entries.map((entry) => ({
      chatId: entry.chatId,
      contactName: entry.contactName,
      text: entry.text,
      source: entry.source
    })),
    [
      {
        chatId: "chat-alice",
        contactName: "Alice",
        text: "new incoming",
        source: "message"
      }
    ]
  );
});

test("WhatsApp page skips bookmark cache writes when chat and message data are unchanged", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    bookmarkData: {
      chats: [
        {
          id: "chat-alice",
          name: "Alice",
          preview: "unchanged",
          avatar: null,
          hasUnread: false,
          isPinned: true
        }
      ],
      messagesByChatId: {
        "chat-alice": [
          {
            id: "message-0",
            text: "same message",
            direction: "incoming",
            isOutgoing: false,
            sender: "",
            timestampLabel: "10:10",
            kind: "text",
            media: null,
            fallbackText: ""
          }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: true
    },
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "unchanged",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: createMainPanelMessages([
      { text: "same message", outgoing: false, time: "10:10" }
    ])
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  assert.deepEqual(storageSets, []);
});

test("WhatsApp page emits preview fallback events for newly unread chat previews", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    bookmarkData: {
      chats: [
        {
          id: "chat-alice",
          name: "Alice",
          preview: "old preview",
          avatar: null,
          hasUnread: false,
          isPinned: false
        }
      ],
      messagesByChatId: {},
      updatedAt: 1781000000000,
      sourceTabAvailable: true
    },
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "preview says hello",
        ariaLabel: "Alice, 1 unread message"
      }
    ]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  const eventWrite = storageSets.find((write) => write.waIncomingMessageEvents);
  assert.ok(eventWrite, "expected a preview fallback event batch");
  assert.deepEqual(
    eventWrite.waIncomingMessageEvents.entries.map((entry) => ({
      chatId: entry.chatId,
      contactName: entry.contactName,
      text: entry.text,
      source: entry.source
    })),
    [
      {
        chatId: "chat-alice",
        contactName: "Alice",
        text: "preview says hello",
        source: "preview"
      }
    ]
  );
});

test("WhatsApp page ignores quoted preview background media when extracting message kind", async () => {
  const storageSets = [];
  const quotedPreview = createNode({
    attrs: {
      "data-testid": "quoted-message",
      style: "background-image: url(https://example.com/quoted.webp)"
    }
  });
  const message = createNode({
    attrs: { "data-testid": "msg-container", "data-message-id": "message-quote" },
    children: [
      quotedPreview,
      createNode({
        tagName: "span",
        textContent: "please check this",
        selectors: ['span[dir="auto"]'],
        attrs: { dir: "auto" }
      }),
      createNode({
        tagName: "span",
        textContent: "10:17",
        attrs: { "data-testid": "msg-meta" }
      })
    ]
  });

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [message]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const cachedMessage = storageSets.at(-1).waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.text, "please check this");
  assert.equal(cachedMessage.kind, "text");
  assert.equal(cachedMessage.media, null);
});

test("WhatsApp page detects outgoing direction from the nested outgoing bubble", async () => {
  const storageSets = [];
  const outgoingBubble = createNode({
    children: [
      createNode({
        tagName: "span",
        textContent: "sent from me",
        selectors: ['span[dir="auto"]'],
        attrs: { dir: "auto" }
      }),
      createNode({
        tagName: "span",
        textContent: "10:18",
        attrs: { "data-testid": "msg-meta" }
      })
    ]
  });
  outgoingBubble.classList.add("message-out");

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [
      createNode({
        attrs: { "data-testid": "msg-container", "data-message-id": "message-out" },
        children: [outgoingBubble]
      })
    ]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const cachedMessage = storageSets.at(-1).waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.direction, "outgoing");
  assert.equal(cachedMessage.isOutgoing, true);
});

test("WhatsApp page detects outgoing direction from WhatsApp true message ids", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [
      createNode({
        attrs: {
          "data-testid": "msg-container",
          "data-id": "true_85212345678@c.us_ABCDEF",
          "data-message-id": "message-id-from-dom"
        },
        children: [
          createNode({
            tagName: "span",
            textContent: "from me by id",
            selectors: ['span[dir="auto"]'],
            attrs: { dir: "auto" }
          })
        ]
      })
    ]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const cachedMessage = storageSets.at(-1).waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.direction, "outgoing");
  assert.equal(cachedMessage.isOutgoing, true);
});

test("WhatsApp page keeps false WhatsApp message ids incoming", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [
      createNode({
        attrs: {
          "data-testid": "msg-container",
          "data-id": "false_85212345678@c.us_ABCDEF"
        },
        children: [
          createNode({
            tagName: "span",
            textContent: "from Alice by id",
            selectors: ['span[dir="auto"]'],
            attrs: { dir: "auto" }
          })
        ]
      })
    ]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const cachedMessage = storageSets.at(-1).waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.direction, "incoming");
  assert.equal(cachedMessage.isOutgoing, false);
});

test("WhatsApp page detects outgoing direction from right-aligned message geometry", async () => {
  const storageSets = [];
  const rightAlignedBubble = createNode({
    rect: { left: 920, right: 1120, width: 200, height: 48 },
    children: [
      createNode({
        tagName: "span",
        textContent: "from me by layout",
        selectors: ['span[dir="auto"]'],
        attrs: { dir: "auto" }
      })
    ]
  });

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [
      createNode({
        attrs: { "data-testid": "msg-container", "data-message-id": "message-layout" },
        children: [rightAlignedBubble]
      })
    ]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const cachedMessage = storageSets.at(-1).waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.direction, "outgoing");
  assert.equal(cachedMessage.isOutgoing, true);
});

test("WhatsApp page ignores quoted outgoing receipts when classifying incoming direction", async () => {
  const storageSets = [];
  const quotedPreview = createNode({
    attrs: { "data-testid": "quoted-message" },
    children: [
      createNode({
        attrs: { "data-testid": "msg-check" }
      })
    ]
  });

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [
      createNode({
        attrs: { "data-testid": "msg-container", "data-message-id": "message-in" },
        children: [
          quotedPreview,
          createNode({
            tagName: "span",
            textContent: "reply from Alice",
            selectors: ['span[dir="auto"]'],
            attrs: { dir: "auto" }
          }),
          createNode({
            tagName: "span",
            textContent: "10:19",
            attrs: { "data-testid": "msg-meta" }
          })
        ]
      })
    ]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const cachedMessage = storageSets.at(-1).waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.direction, "incoming");
  assert.equal(cachedMessage.isOutgoing, false);
});

test("WhatsApp page persists image and sticker metadata for the active bookmark chat", async () => {
  const storageSets = [];
  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest media",
        avatar: "https://example.com/avatar.png",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: createMainPanelMessages([
      {
        text: "圖片",
        time: "10:15",
        media: {
          kind: "image",
          src: "https://example.com/photo.jpg",
          alt: "圖片"
        }
      },
      {
        time: "10:16",
        media: {
          kind: "sticker",
          ariaLabel: "sticker"
        }
      }
    ])
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.equal(latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"].length, 2);
  assert.deepEqual(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"].map((entry) => ({
      text: entry.text,
      kind: entry.kind,
      mediaKind: entry.media && entry.media.kind,
      mediaSrc: entry.media && entry.media.src,
      fallbackText: entry.fallbackText
    })),
    [
      {
        text: "",
        kind: "image",
        mediaKind: "image",
        mediaSrc: "https://example.com/photo.jpg",
        fallbackText: "图片"
      },
      {
        text: "",
        kind: "sticker",
        mediaKind: "sticker",
        mediaSrc: "",
        fallbackText: "贴纸"
      }
    ]
  );
});

test("WhatsApp page persists sticker media even when the sticker image lives inside copyable text", async () => {
  const storageSets = [];
  const copyableText = createNode({
    selectors: [".copyable-text", "div.copyable-text"]
  });
  const stickerImage = copyableText.appendChild(
    createNode({
      tagName: "img",
      src: "https://example.com/sticker.webp",
      attrs: {
        alt: "😂"
      }
    })
  );
  stickerImage.classList.add("sticker");

  const message = createNode({
    attrs: { "data-testid": "msg-container", "data-message-id": "message-0" },
    children: [
      copyableText,
      createNode({
        tagName: "span",
        textContent: "10:15",
        attrs: { "data-testid": "msg-meta" }
      })
    ]
  });

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest media",
        avatar: "https://example.com/avatar.png",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [message]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  const cachedMessage = latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.kind, "sticker");
  assert.equal(cachedMessage.text, "");
  assert.equal(cachedMessage.media.kind, "sticker");
  assert.equal(cachedMessage.media.src, "https://example.com/sticker.webp");
});

test("WhatsApp page persists sticker media when the sticker label sits on a wrapper", async () => {
  const storageSets = [];
  const stickerWrapper = createNode({
    attrs: {
      "aria-label": "sticker"
    }
  });
  stickerWrapper.appendChild(
    createNode({
      tagName: "img",
      src: "https://example.com/sticker.webp",
      attrs: {
        alt: "😂"
      }
    })
  );

  const message = createNode({
    attrs: { "data-testid": "msg-container", "data-message-id": "message-0" },
    children: [
      stickerWrapper,
      createNode({
        tagName: "span",
        textContent: "10:15",
        attrs: { "data-testid": "msg-meta" }
      })
    ]
  });

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest media",
        avatar: "https://example.com/avatar.png",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [message]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  const cachedMessage = latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.kind, "sticker");
  assert.equal(cachedMessage.media.kind, "sticker");
  assert.equal(cachedMessage.media.src, "https://example.com/sticker.webp");
});

test("WhatsApp page persists portable media asset data for stickers", async () => {
  const storageSets = [];
  const stickerDataUrl = "data:image/webp;base64,U1RJQ0tFUg==";

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest media",
        avatar: "https://example.com/avatar.png",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: createMainPanelMessages([
      {
        time: "10:15",
        media: {
          kind: "sticker",
          src: stickerDataUrl,
          alt: "Saved sticker"
        }
      }
    ])
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  const cachedMessage = latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.kind, "sticker");
  assert.equal(cachedMessage.media.kind, "sticker");
  assert.equal(cachedMessage.media.assetDataUrl, stickerDataUrl);
});

test("WhatsApp page persists a larger local asset for image zoom", async () => {
  const storageSets = [];

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest media",
        avatar: "https://example.com/avatar.png",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: createMainPanelMessages([
      {
        time: "10:15",
        media: {
          kind: "image",
          src: "blob:https://web.whatsapp.com/thumb",
          alt: "Saved photo",
          naturalWidth: 2400,
          naturalHeight: 1200
        }
      }
    ])
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  const cachedMessage = latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.kind, "image");
  assert.equal(cachedMessage.media.assetDataUrl, "data:image/jpeg;base64,720x360");
  assert.equal(cachedMessage.media.fullAssetDataUrl, "data:image/jpeg;base64,2048x1024");
});

test("WhatsApp page keeps emoji-only images as text instead of media previews", async () => {
  const storageSets = [];
  const copyableText = createNode({
    selectors: [".copyable-text", "div.copyable-text"]
  });
  copyableText.appendChild(
    createNode({
      tagName: "img",
      attrs: {
        alt: "😂",
        "data-testid": "emoji"
      }
    })
  );

  const message = createNode({
    attrs: { "data-testid": "msg-container", "data-message-id": "message-0" },
    children: [
      copyableText,
      createNode({
        tagName: "span",
        textContent: "10:15",
        attrs: { "data-testid": "msg-meta" }
      })
    ]
  });

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    chatRows: [
      {
        id: "chat-alice",
        name: "Alice",
        preview: "Latest message",
        avatar: "https://example.com/avatar.png",
        pinned: true
      }
    ],
    activeConversationName: "Alice",
    mainMessages: [message]
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  const cachedMessage = latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"][0];
  assert.equal(cachedMessage.kind, "text");
  assert.equal(cachedMessage.text, "😂");
  assert.equal(cachedMessage.media, null);

  const messagesArea = context.document.querySelector(".wa-bookmark-bar__panel-messages");
  assert.ok(messagesArea, "messages area should exist");
  assert.equal(messagesArea.querySelector("img"), null);
  assert.match(messagesArea.textContent, /😂/);
});

test("bookmark panel renders sticker placeholders even without a media src", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [
          {
            id: "m1",
            text: "",
            kind: "sticker",
            fallbackText: "贴纸",
            media: {
              kind: "sticker",
              src: "",
              ariaLabel: "sticker"
            },
            direction: "incoming"
          }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  const messagesArea = document.querySelector(".wa-bookmark-bar__panel-messages");
  assert.ok(messagesArea, "messages area should exist");
  assert.match(messagesArea.textContent, /贴纸|貼紙/);
  assert.doesNotMatch(messagesArea.textContent, /^(?:10:16)?$/);
});

test("bookmark bar renders aliases, groups, and theme styling from settings", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [
        { id: "chat-1", name: "Alice", preview: "Latest", avatar: null, isPinned: true },
        { id: "chat-2", name: "Bob", preview: "Update", avatar: null, isPinned: false }
      ],
      messagesByChatId: {
        "chat-1": [
          {
            id: "m1",
            text: "hello",
            direction: "incoming",
            timestampLabel: "10:15"
          }
        ]
      },
      updatedAt: Date.now() - 120000,
      sourceTabAvailable: false
    },
    bookmarkSettings: {
      bookmarkBarEnabled: true,
      bookmarkBarTheme: "midnight",
      bookmarkBarColor: "#223344",
      pinnedContacts: ["Bob"],
      contactAliases: {
        Alice: "Client A"
      },
      pinnedContactGroups: [
        { name: "Work", contacts: ["Alice"] }
      ]
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  const bar = document.querySelector(".wa-bookmark-bar");
  assert.ok(bar, "expected bookmark bar to exist");
  assert.equal(bar.dataset.theme, "midnight");
  assert.match(bar.textContent, /Work/);
  assert.match(bar.textContent, /Client A/);
  assert.match(bar.textContent, /Bob/);
});

test("bookmark panel shows freshness and read-only status when no live WhatsApp tab is available", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [
        { id: "chat-1", name: "Alice", preview: "Latest", avatar: null, isPinned: true }
      ],
      messagesByChatId: {
        "chat-1": [
          {
            id: "m1",
            text: "hello",
            direction: "incoming",
            timestampLabel: "10:15"
          }
        ]
      },
      updatedAt: Date.now() - 120000,
      sourceTabAvailable: false
    },
    bookmarkSettings: {
      bookmarkBarEnabled: true,
      bookmarkBarTheme: "paper"
    },
    sendAvailable: false
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  const panel = document.querySelector(".wa-bookmark-bar__panel");
  assert.ok(panel, "expected panel to exist");
  assert.equal(panel.dataset.theme, "paper");
  assert.equal(panel.style["--wa-bookmark-bar-panel-bg"], "#ffffff");
  assert.equal(panel.style["--wa-bookmark-bar-panel-alt"], "#f7f2ea");

  const status = document.querySelector(".wa-bookmark-bar__panel-status");
  assert.ok(status, "expected panel status");
  assert.match(status.textContent, /Synced/);
  assert.match(status.textContent, /Read-only cache/);
  assert.equal(getPanelInput(document).disabled, true);
  assert.match(getPanelNotice(document), /open WhatsApp Web to send/i);
});

test("WhatsApp page preserves cached messages when fresh extraction yields none", async () => {
  const storageSets = [];
  const initialBookmarkData = {
    chats: [{ id: "chat-alice", name: "Alice", preview: "", avatar: null }],
    messagesByChatId: {
      "chat-alice": [
        { id: "m1", text: "older", direction: "incoming", timestampLabel: "09:00" }
      ]
    },
    updatedAt: 1781000000000,
    sourceTabAvailable: true
  };

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    bookmarkData: initialBookmarkData,
    chatRows: [{ id: "chat-alice", name: "Alice", preview: "", avatar: null, pinned: true }],
    mainMessages: []
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.deepEqual(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"],
    initialBookmarkData.messagesByChatId["chat-alice"]
  );
});

test("WhatsApp page does not cache messages until the main panel matches the selected chat", async () => {
  const storageSets = [];
  const initialBookmarkData = {
    chats: [
      { id: "chat-alice", name: "Alice", preview: "", avatar: null },
      { id: "chat-bob", name: "Bob", preview: "", avatar: null }
    ],
    messagesByChatId: {
      "chat-alice": [
        { id: "a1", text: "alice older", direction: "incoming", timestampLabel: "09:00" }
      ],
      "chat-bob": [
        { id: "b1", text: "bob older", direction: "incoming", timestampLabel: "09:05" }
      ]
    },
    updatedAt: 1781000000000,
    sourceTabAvailable: true
  };

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    bookmarkData: initialBookmarkData,
    chatRows: [
      { id: "chat-alice", name: "Alice", preview: "", avatar: null, pinned: true },
      { id: "chat-bob", name: "Bob", preview: "", avatar: null, pinned: true }
    ],
    activeConversationName: "Bob",
    mainMessages: createMainPanelMessages([
      { text: "bob newest", outgoing: false, time: "10:20" }
    ]),
    deferTimeouts: true
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-alice");
  await flushAsync();
  context.__runTimeouts();
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.deepEqual(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"],
    initialBookmarkData.messagesByChatId["chat-alice"]
  );
  assert.notDeepEqual(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-alice"],
    latestWrite.waBookmarkBarData.messagesByChatId["chat-bob"]
  );
});

test("WhatsApp page does not cache to the wrong bookmark when two chats share the same name", async () => {
  const storageSets = [];
  const initialBookmarkData = {
    chats: [
      { id: "chat-sam-1", name: "Sam", preview: "", avatar: null },
      { id: "chat-sam-2", name: "Sam", preview: "", avatar: null }
    ],
    messagesByChatId: {
      "chat-sam-1": [
        { id: "s1", text: "sam one older", direction: "incoming", timestampLabel: "09:00" }
      ],
      "chat-sam-2": [
        { id: "s2", text: "sam two older", direction: "incoming", timestampLabel: "09:01" }
      ]
    },
    updatedAt: 1781000000000,
    sourceTabAvailable: true
  };

  const { context } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    storageSets,
    bookmarkData: initialBookmarkData,
    chatRows: [
      { id: "chat-sam-1", name: "Sam", preview: "", avatar: null, ariaLabel: "chat-sam-1", pinned: true },
      { id: "chat-sam-2", name: "Sam", preview: "", avatar: null, ariaLabel: "chat-sam-2", pinned: true }
    ],
    activeConversationName: "Sam",
    activeConversationId: "chat-sam-2",
    mainMessages: createMainPanelMessages([
      { text: "sam two newest", outgoing: false, time: "10:22" }
    ]),
    deferTimeouts: true
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  context.__openBookmarkChat("chat-sam-1");
  await flushAsync();
  context.__runTimeouts();
  await flushAsync();

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.deepEqual(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-sam-1"],
    initialBookmarkData.messagesByChatId["chat-sam-1"]
  );
  assert.deepEqual(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-sam-2"].map((entry) => ({
      text: entry.text,
      direction: entry.direction,
      timestampLabel: entry.timestampLabel
    })),
    [{ text: "sam two newest", direction: "incoming", timestampLabel: "10:22" }]
  );
});

test("bookmark panel renders cached messages from storage on non-WhatsApp pages", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [
          { id: "m1", text: "cached hello", direction: "incoming", timestampLabel: "10:15" }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  assert.match(getMessagesText(document), /cached hello/);
  assert.equal(getPanelTitle(document), "Alice");
});

test("bookmark panel disables the composer when WhatsApp Web is unavailable", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [{ id: "m1", text: "cached hello", direction: "incoming" }]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    },
    sendAvailable: false
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  assert.equal(getPanelInput(document).disabled, true);
  assert.equal(getPanelSendButton(document).disabled, true);
  assert.match(getPanelNotice(document), /open WhatsApp Web to send/i);
});

test("bookmark panel shows sync freshness text when cached data exists", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {},
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  assert.match(getPanelStatus(document), /Synced/);
});

test("bookmark panel renders cached image and sticker previews", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [
          {
            id: "m1",
            text: "Beach day",
            kind: "image",
            fallbackText: "图片",
            media: {
              kind: "image",
              src: "https://example.com/photo.jpg",
              alt: "Vacation photo"
            },
            direction: "incoming"
          },
          {
            id: "m2",
            text: "",
            kind: "sticker",
            fallbackText: "贴纸",
            media: {
              kind: "sticker",
              src: "https://example.com/sticker.webp",
              alt: "Funny sticker"
            },
            direction: "incoming"
          }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  const messagesArea = document.querySelector(".wa-bookmark-bar__panel-messages");
  assert.ok(messagesArea, "messages area should exist");
  assert.equal(messagesArea.children.length, 2);

  const firstBubble = messagesArea.children[0];
  const secondBubble = messagesArea.children[1];
  const firstMedia = firstBubble.querySelector("img");
  const secondMedia = secondBubble.querySelector("img");
  const secondFallback = secondBubble.querySelector(".wa-bookmark-bar__message-media-fallback");

  assert.ok(firstMedia, "first media bubble should render an image");
  assert.equal(firstMedia.getAttribute("data-message-kind"), "image");
  assert.equal(firstMedia.src, "https://example.com/photo.jpg");
  assert.equal(secondMedia, null, "sticker bubble should not render a broken image on non-WhatsApp pages");
  assert.ok(secondFallback, "sticker bubble should render a text fallback badge");
  assert.equal(secondFallback.getAttribute("data-message-kind"), "sticker");
  assert.match(secondFallback.textContent, /Funny sticker|贴纸|貼紙|😂/);
  assert.match(getMessagesText(document), /Beach day/);
});

test("bookmark panel prefers persisted media assets on non-WhatsApp pages", async () => {
  const imageAssetDataUrl = "data:image/jpeg;base64,SU1BR0U=";
  const highResolutionImageUrl = "https://example.com/photo-2048.jpg";
  const stickerAssetDataUrl = "data:image/webp;base64,U1RJQ0tFUg==";
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [
          {
            id: "m1",
            text: "",
            kind: "image",
            fallbackText: "图片",
            media: {
              kind: "image",
              src: "https://example.com/photo.jpg",
              zoomSrc: highResolutionImageUrl,
              assetDataUrl: imageAssetDataUrl,
              alt: "Vacation photo"
            },
            direction: "incoming"
          },
          {
            id: "m2",
            text: "",
            kind: "sticker",
            fallbackText: "贴纸",
            media: {
              kind: "sticker",
              src: "https://example.com/sticker.webp",
              assetDataUrl: stickerAssetDataUrl,
              alt: "Funny sticker"
            },
            direction: "incoming"
          }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  const mediaNodes = document.querySelectorAll(".wa-bookmark-bar__message-media-asset");
  assert.equal(mediaNodes.length, 2);
  assert.equal(mediaNodes[0].src, imageAssetDataUrl);
  assert.equal(mediaNodes[1].src, stickerAssetDataUrl);
  assert.equal(mediaNodes[1].getAttribute("data-message-kind"), "sticker");

  mediaNodes[0].dispatchEvent({ type: "click" });
  await flushAsync();

  const zoomImage = document.querySelector(".wa-bookmark-bar__media-zoom-image");
  assert.ok(zoomImage, "clicking a cached image should open the media zoom");
  assert.equal(zoomImage.src, highResolutionImageUrl);
});

test("bookmark panel uses the larger persisted image asset for zoom without a high-res URL", async () => {
  const imageAssetDataUrl = "data:image/jpeg;base64,PREVIEW";
  const fullAssetDataUrl = "data:image/jpeg;base64,FULL";
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [
          {
            id: "m1",
            text: "",
            kind: "image",
            fallbackText: "图片",
            media: {
              kind: "image",
              src: "https://example.com/thumb.jpg",
              assetDataUrl: imageAssetDataUrl,
              fullAssetDataUrl: fullAssetDataUrl,
              alt: "Vacation photo"
            },
            direction: "incoming"
          }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  const mediaNode = document.querySelector(".wa-bookmark-bar__message-media-asset");
  assert.ok(mediaNode, "cached image should render");
  assert.equal(mediaNode.src, imageAssetDataUrl);

  mediaNode.dispatchEvent({ type: "click" });
  await flushAsync();

  const zoomImage = document.querySelector(".wa-bookmark-bar__media-zoom-image");
  assert.ok(zoomImage, "clicking a cached image should open the media zoom");
  assert.equal(zoomImage.src, fullAssetDataUrl);
});

test("bookmark panel preserves scroll position when refreshed from sync", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [
          { id: "m1", text: "older one", direction: "incoming", timestampLabel: "09:00" },
          { id: "m2", text: "older two", direction: "incoming", timestampLabel: "09:01" },
          { id: "m3", text: "older three", direction: "incoming", timestampLabel: "09:02" }
        ]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  const messagesArea = document.querySelector(".wa-bookmark-bar__panel-messages");
  assert.ok(messagesArea, "messages area should exist");

  messagesArea.clientHeight = 120;
  messagesArea.scrollHeight = 420;
  messagesArea.scrollTop = 180;

  await context.WhatsAppBookmarkBar.update();
  await flushAsync();

  assert.equal(messagesArea.scrollTop, 180);
  assert.match(getMessagesText(document), /older three/);
});

test("bookmark bar ignores invalidated context while refreshing WhatsApp messages", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "web.whatsapp.com",
    chatRows: [{ id: "chat-alice", name: "Alice" }],
    activeConversationName: "Alice",
    activeConversationId: "chat-alice"
  });

  const titleNode = document.querySelectorAll(
    '#pane-side [data-testid="cell-frame-title"], #pane-side [data-testid="cell-frame-title"] span[dir="auto"]'
  )[0];
  assert.ok(titleNode, "title node should exist");
  titleNode.setAttribute("role", "listitem");
  titleNode.setAttribute("tabindex", "0");

  const originalQuerySelectorAll = document.querySelectorAll.bind(document);
  document.querySelectorAll = function (selector) {
    if (selector === '#main [data-testid="msg-container"]') {
      throw new Error("Extension context invalidated.");
    }
    return originalQuerySelectorAll(selector);
  };

  await assert.doesNotReject(async () => {
    await context.WhatsAppBookmarkBar.update();
  });
});

test("bookmark panel shows an emoji picker and inserts emoji into the composer", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [{ id: "m1", text: "cached hello", direction: "incoming" }]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: true
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  const emojiBtn = getEmojiButton(document);
  const picker = getEmojiPicker(document);
  const input = getPanelInput(document);
  assert.ok(emojiBtn, "emoji button should exist");
  assert.ok(picker, "emoji picker should exist");
  assert.ok(input, "panel input should exist");
  assert.equal(picker.style.display, "none", "picker should be hidden initially");

  emojiBtn.dispatchEvent(new context.MouseEvent("click", { bubbles: true }));
  assert.equal(picker.style.display, "flex", "picker should be visible after clicking emoji button");

  const firstEmoji = getFirstEmojiItem(document);
  assert.ok(firstEmoji, "first emoji item should exist");
  const emojiChar = firstEmoji.textContent;
  assert.ok(emojiChar, "first emoji should have a character");

  input.value = "Hello ";
  firstEmoji.dispatchEvent(new context.MouseEvent("click", { bubbles: true }));
  assert.match(input.value, new RegExp(emojiChar), "input should contain the inserted emoji");
});

test("bookmark panel disables the emoji button when WhatsApp Web is unavailable", async () => {
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: {
        "chat-1": [{ id: "m1", text: "cached hello", direction: "incoming" }]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    },
    sendAvailable: false
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  assert.equal(getEmojiButton(document).disabled, true, "emoji button should be disabled");
});

test("bookmark panel ignores stale send-availability responses after rapid chat switching", async () => {
  const statusDeferred = createDeferred();
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    bookmarkData: {
      chats: [
        { id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true },
        { id: "chat-2", name: "Bob", preview: "", avatar: null, isPinned: true }
      ],
      messagesByChatId: {
        "chat-1": [{ id: "m1", text: "alice cached", direction: "incoming" }],
        "chat-2": [{ id: "m2", text: "bob cached", direction: "incoming" }]
      },
      updatedAt: 1781000000000,
      sourceTabAvailable: false
    },
    sendAvailable: statusDeferred.promise
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  clickBookmark(document, context.MouseEvent, "chat-2");
  await flushAsync();

  statusDeferred.resolve({ ok: true, available: false });
  await flushAsync();

  assert.equal(getPanelTitle(document), "Bob");
  assert.match(getMessagesText(document), /bob cached/);
  assert.doesNotMatch(getMessagesText(document), /alice cached/);
});

test("remote send appends to cache only after a successful relay", async () => {
  const sentMessages = [];
  const storageSets = [];
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    storageSets,
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: { "chat-1": [] },
      updatedAt: 1781000000000,
      sourceTabAvailable: true
    },
    sendAvailable: true,
    sendMessageImpl(message) {
      sentMessages.push(message);
      return Promise.resolve({ ok: true });
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  typeAndSend(document, context.MouseEvent, "new message");
  await flushAsync();

  assert.equal(sentMessages[0].type, "BOOKMARK_BAR_SEND");
  assert.equal(sentMessages[0].chatId, "chat-1");

  const latestWrite = storageSets.at(-1);
  assert.ok(latestWrite, "expected bookmark cache write");
  assert.equal(
    latestWrite.waBookmarkBarData.messagesByChatId["chat-1"].at(-1).text,
    "new message"
  );
  assert.match(getMessagesText(document), /new message/);
  assert.match(getPanelStatus(document), /Sent just now/);
});

test("remote send shows feedback and preserves composer text until relay succeeds", async () => {
  const sentMessages = [];
  const storageSets = [];
  const deferred = createDeferred();
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    storageSets,
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: { "chat-1": [] },
      updatedAt: 1781000000000,
      sourceTabAvailable: true
    },
    sendAvailable: true,
    sendMessageImpl(message) {
      sentMessages.push(message);
      return deferred.promise;
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();

  typeAndSend(document, context.MouseEvent, "will fail");
  await flushAsync();

  assert.equal(sentMessages.length, 1);
  assert.match(getPanelStatus(document), /Sending/);
  assert.equal(getPanelInput(document).disabled, false);
  assert.equal(getPanelInput(document).value, "");
  getPanelInput(document).value = "next draft";

  deferred.resolve({ ok: false, error: "compose box not found" });
  await flushAsync();

  assert.match(getPanelStatus(document), /Send failed/);
  assert.equal(getPanelInput(document).disabled, false);
  assert.equal(getPanelInput(document).value, "next draft");
  assert.equal(storageSets.length, 0);
});

test("remote send failure reports the error without locking the composer", async () => {
  const storageSets = [];
  const { context, document } = bootBookmarkBar({
    hostname: "example.com",
    storageSets,
    bookmarkData: {
      chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, isPinned: true }],
      messagesByChatId: { "chat-1": [] },
      updatedAt: 1781000000000,
      sourceTabAvailable: true
    },
    sendAvailable: true,
    sendMessageImpl() {
      return Promise.resolve(undefined);
    }
  });

  context.WhatsAppBookmarkBar.create();
  await flushAsync();

  clickBookmark(document, context.MouseEvent, "chat-1");
  await flushAsync();
  assert.equal(getPanelInput(document).disabled, false);

  typeAndSend(document, context.MouseEvent, "should not send");
  await flushAsync();

  assert.equal(getPanelInput(document).disabled, false);
  assert.equal(getPanelSendButton(document).disabled, false);
  assert.match(getPanelStatus(document), /Send failed/);
  assert.equal(getPanelNotice(document), "");
  assert.doesNotMatch(getMessagesText(document), /should not send/);
  assert.equal(storageSets.length, 0);
});

function bootBookmarkBar({
  hostname,
  bookmarkData,
  bookmarkSettings,
  sendAvailable = false,
  sendMessageImpl,
  storageSets = [],
  chatRows = [],
  mainMessages = [],
  activeConversationName = "",
  activeConversationId = "",
  deferTimeouts = false
}) {
  const document = createDocument({
    selectorMap: createSelectorMap({
      chatRows,
      mainMessages,
      activeConversationName,
      activeConversationId
    })
  });
  const storageData = bookmarkData
    ? { waBookmarkBarData: clone(bookmarkData) }
    : {};
  const settingsData = {
    waPrivacyBlurSettings: clone(
      bookmarkSettings || {
        bookmarkBarEnabled: false
      }
    )
  };

  const bookmarkDataApi = loadBookmarkDataApi();
  const pendingTimeouts = [];

  const context = vm.createContext({
    WhatsAppBlurSettings: settingsApi,
    WhatsAppBookmarkData: bookmarkDataApi,
    chrome: {
      storage: {
        local: {
          async get(key) {
            if (key === "waPrivacyBlurSettings") {
              return clone(settingsData);
            }

            if (typeof key === "string") {
              return storageData[key] ? { [key]: clone(storageData[key]) } : {};
            }

            return {};
          },
          async set(value) {
            storageSets.push(clone(value));
            Object.assign(storageData, clone(value));
            if (value && value.waPrivacyBlurSettings) {
              settingsData.waPrivacyBlurSettings = clone(value.waPrivacyBlurSettings);
            }
          }
        },
        onChanged: {
          addListener() {}
        }
      },
      runtime: {
        async sendMessage(message) {
          if (message.type === "BOOKMARK_BAR_STATUS") {
            if (sendAvailable && typeof sendAvailable.then === "function") {
              return sendAvailable;
            }
            return { ok: true, available: sendAvailable };
          }
          if (message.type === "BOOKMARK_BAR_REQUEST_CHATS") {
            return { ok: true };
          }
          if (message.type === "BOOKMARK_BAR_SEND") {
            if (typeof sendMessageImpl === "function") {
              return sendMessageImpl(message);
            }
            return { ok: sendAvailable };
          }
          return { ok: true };
        },
        onMessage: {
          addListener() {}
        }
      }
    },
    document,
    location: { hostname },
    window: null,
    innerWidth: 1280,
    setInterval() {
      return 1;
    },
    clearInterval() {},
    setTimeout(callback) {
      if (deferTimeouts) {
        pendingTimeouts.push(callback);
        return pendingTimeouts.length;
      }
      callback();
      return 1;
    },
    clearTimeout() {},
    MouseEvent: function MouseEvent(type, init) {
      this.type = type;
      Object.assign(this, init);
    },
    InputEvent: function InputEvent(type, init) {
      this.type = type;
      Object.assign(this, init);
    },
    KeyboardEvent: function KeyboardEvent(type, init) {
      this.type = type;
      Object.assign(this, init);
    },
    CSS: {
      escape(value) {
        return value;
      }
    },
    console
  });
  context.window = context;
  context.globalThis = context;

  vm.runInContext(bookmarkBarSource, context, { filename: "bookmark-bar.js" });

  context.__openBookmarkChat = function openBookmarkChat(chatId) {
    clickBookmark(document, context.MouseEvent, chatId);
  };
  context.__runTimeouts = function runTimeouts() {
    while (pendingTimeouts.length > 0) {
      const callback = pendingTimeouts.shift();
      callback();
    }
  };

  return { context, document };
}

function clickBookmark(document, MouseEventCtor, chatId) {
  const item = document.querySelector('[data-chat-id="' + chatId + '"]');
  assert.ok(item, "bookmark item should exist");
  item.dispatchEvent(new MouseEventCtor("click", { bubbles: true }));
}

function getPanelInput(document) {
  return document.querySelector(".wa-bookmark-bar__panel-input");
}

function getPanelSendButton(document) {
  return document.querySelector(".wa-bookmark-bar__panel-send");
}

function getEmojiButton(document) {
  return document.querySelector(".wa-bookmark-bar__panel-emoji-btn");
}

function getEmojiPicker(document) {
  return document.querySelector(".wa-bookmark-bar__emoji-picker");
}

function getFirstEmojiItem(document) {
  return document.querySelector(".wa-bookmark-bar__emoji-picker-item");
}

function typeAndSend(document, MouseEventCtor, text) {
  const input = getPanelInput(document);
  const sendButton = getPanelSendButton(document);
  assert.ok(input, "panel input should exist");
  assert.ok(sendButton, "panel send button should exist");
  input.value = text;
  sendButton.dispatchEvent(new MouseEventCtor("click", { bubbles: true }));
}

function getPanelNotice(document) {
  const notice = document.querySelector(".wa-bookmark-bar__panel-notice");
  return notice ? notice.textContent : "";
}

function getPanelStatus(document) {
  const status = document.querySelector(".wa-bookmark-bar__panel-status");
  return status ? status.textContent : "";
}

function getMessagesText(document) {
  const messages = document.querySelector(".wa-bookmark-bar__panel-messages");
  return messages ? messages.textContent : "";
}

function getPanelTitle(document) {
  const titleGroup = document.querySelector(".wa-bookmark-bar__panel-title-group");
  if (!titleGroup || !titleGroup.children.length) {
    return "";
  }
  return titleGroup.children[0].textContent;
}

function createDocument({ selectorMap = {} } = {}) {
  const body = createNode({ tagName: "body" });
  const documentElement = createNode({ tagName: "html" });
  documentElement.appendChild(body);

  return {
    body,
    documentElement,
    querySelector(selector) {
      return querySelectorFrom(documentElement, selector, selectorMap);
    },
    querySelectorAll(selector) {
      return querySelectorAllFrom(documentElement, selector, selectorMap);
    },
    createElement(tagName) {
      return createNode({ tagName });
    },
    addEventListener() {},
    removeEventListener() {}
  };
}

function createSelectorMap({
  chatRows = [],
  mainMessages = [],
  activeConversationName = "",
  activeConversationId = ""
} = {}) {
  const titleSelector =
    '#pane-side [data-testid="cell-frame-title"], #pane-side [data-testid="cell-frame-title"] span[dir="auto"]';
  const activeHeader = createNode({
    textContent: activeConversationName,
    attrs: {
      title: activeConversationName,
      ...(activeConversationId ? { "data-chat-id": activeConversationId } : {})
    }
  });

  return {
    [titleSelector]: chatRows.map(createChatRow).map((row) => row.titleNode),
    '#main [data-testid="msg-container"]': mainMessages,
    '#main header [title]': activeConversationName ? [activeHeader] : []
  };
}

function createChatRow({ id, name, preview = "", avatar = null, ariaLabel = "", pinned = false }) {
  const titleNode = createNode({
    textContent: name,
    selectors: ['[data-testid="cell-frame-title"]']
  });
  const previewNode = createNode({
    textContent: preview,
    attrs: { "data-testid": "cell-frame-secondary" }
  });
  const children = [titleNode, previewNode];

  if (avatar) {
    children.push(
      createNode({
        tagName: "img",
        src: avatar
      })
    );
  }

  if (pinned) {
    children.push(
      createNode({
        attrs: { "data-testid": "pin" }
      })
    );
  }

  const containerNode = createNode({
    selectors: ['[data-testid="cell-frame-container"]'],
    attrs: {
      "data-testid": id,
      ...(ariaLabel ? { "aria-label": ariaLabel } : {})
    },
    children
  });

  return {
    containerNode,
    titleNode
  };
}

function createMainPanelMessages(entries) {
  return entries.map(function createMessage(entry, index) {
    const children = [];

    if (entry.media) {
      const mediaKind = entry.media.kind || "image";
      const mediaAttrs = {};

      if (entry.media.alt) {
        mediaAttrs.alt = entry.media.alt;
      }
      if (entry.media.ariaLabel) {
        mediaAttrs["aria-label"] = entry.media.ariaLabel;
      }
      if (entry.media.poster) {
        mediaAttrs.poster = entry.media.poster;
      }
      if (entry.media.testId) {
        mediaAttrs["data-testid"] = entry.media.testId;
      }

      let mediaNode;
      if (mediaKind === "video") {
        mediaNode = createNode({
          tagName: "video",
          src: entry.media.src || "",
          attrs: mediaAttrs,
          naturalWidth: entry.media.naturalWidth,
          naturalHeight: entry.media.naturalHeight
        });
      } else if (mediaKind === "audio") {
        mediaNode = createNode({
          tagName: "audio",
          src: entry.media.src || "",
          attrs: mediaAttrs
        });
      } else if (mediaKind === "canvas") {
        mediaNode = createNode({
          tagName: "canvas",
          attrs: mediaAttrs
        });
        if (entry.media.src) {
          mediaNode.setAttribute("data-src", entry.media.src);
        }
      } else {
        mediaNode = createNode({
          tagName: "img",
          src: entry.media.src || "",
          attrs: mediaAttrs,
          naturalWidth: entry.media.naturalWidth,
          naturalHeight: entry.media.naturalHeight,
          width: entry.media.width,
          height: entry.media.height,
          complete: entry.media.complete
        });
      }

      if (mediaKind === "sticker") {
        mediaNode.classList.add("sticker");
        mediaNode.setAttribute("data-testid", mediaAttrs["data-testid"] || "sticker");
      }

      children.push(mediaNode);
    }

    if (entry.text) {
      children.push(
        createNode({
          tagName: "span",
          textContent: entry.text,
          selectors: ['span[dir="auto"]'],
          attrs: { dir: "auto" }
        })
      );
    }

    const timeNode = createNode({
      tagName: "span",
      textContent: entry.time,
      attrs: { "data-testid": "msg-meta" }
    });
    children.push(timeNode);

    if (entry.outgoing) {
      children.push(
        createNode({
          attrs: { "data-testid": "msg-check" }
        })
      );
    }

    return createNode({
      attrs: { "data-testid": "msg-container", "data-message-id": "message-" + index },
      children
    });
  });
}

function loadBookmarkDataApi() {
  return require(path.join(__dirname, "..", "src", "shared", "bookmark-data.js"));
}

function createNode({
  tagName = "div",
  selectors = [],
  attrs = {},
  children = [],
  textContent = "",
  src = "",
  naturalWidth = 0,
  naturalHeight = 0,
  width = 0,
  height = 0,
  complete = true,
  rect = null
} = {}) {
  let ownText = textContent;
  let innerHtml = textContent;

  const node = {
    tagName: String(tagName).toLowerCase(),
    parentElement: null,
    children: [],
    style: {},
    dataset: {},
    attrs: new Map(),
    selectors: new Set(selectors),
    listeners: new Map(),
    className: "",
    id: "",
    disabled: false,
    value: "",
    placeholder: "",
    type: "",
    src,
    naturalWidth,
    naturalHeight,
    width,
    height,
    complete,
    scrollTop: 0,
    scrollHeight: 0,
    classList: {
      add(...names) {
        const classes = new Set(node.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => classes.add(name));
        node.className = Array.from(classes).join(" ");
      },
      remove(...names) {
        const toRemove = new Set(names);
        node.className = node.className
          .split(/\s+/)
          .filter((name) => name && !toRemove.has(name))
          .join(" ");
      },
      contains(name) {
        return node.className.split(/\s+/).includes(name);
      }
    },
    appendChild(child) {
      child.parentElement = node;
      node.children.push(child);
      return child;
    },
    remove() {
      if (!node.parentElement) return;
      node.parentElement.children = node.parentElement.children.filter((child) => child !== node);
      node.parentElement = null;
    },
    addEventListener(type, listener) {
      const listeners = node.listeners.get(type) || [];
      listeners.push(listener);
      node.listeners.set(type, listeners);
    },
    dispatchEvent(event) {
      event.target = event.target || node;
      event.currentTarget = node;
      event.stopPropagation = event.stopPropagation || function stopPropagation() {};
      const listeners = node.listeners.get(event.type) || [];
      listeners.forEach((listener) => listener.call(node, event));
      return true;
    },
    click() {
      node.dispatchEvent({ type: "click" });
    },
    focus() {},
    scrollIntoView() {},
    getContext(type) {
      if (node.tagName !== "canvas" || type !== "2d") {
        return null;
      }

      return {
        drawImage() {}
      };
    },
    toDataURL(type) {
      if (node.tagName !== "canvas") {
        return "";
      }

      return "data:" + (type || "image/png") + ";base64," + node.width + "x" + node.height;
    },
    contains(target) {
      if (target === node) return true;
      return node.children.some((child) => child.contains(target));
    },
    getBoundingClientRect() {
      return rect || { left: 16, right: 16, width: 0, height: 0 };
    },
    getAttribute(name) {
      if (name === "class") return node.className || null;
      if (name === "id") return node.id || null;
      if (name.startsWith("data-")) {
        const dataKey = dataAttrToProp(name);
        if (Object.hasOwn(node.dataset, dataKey)) {
          return node.dataset[dataKey];
        }
      }
      return node.attrs.has(name) ? node.attrs.get(name) : null;
    },
    setAttribute(name, value) {
      if (name === "class") {
        node.className = String(value);
        return;
      }
      if (name === "id") {
        node.id = String(value);
        return;
      }
      if (name.startsWith("data-")) {
        node.dataset[dataAttrToProp(name)] = String(value);
      }
      node.attrs.set(name, String(value));
    },
    querySelector(selector) {
      return querySelectorFrom(node, selector);
    },
    querySelectorAll(selector) {
      return querySelectorAllFrom(node, selector);
    },
    closest(selector) {
      let current = node;
      while (current) {
        if (matchesSelector(current, selector)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }
  };

  Object.defineProperty(node, "textContent", {
    get() {
      return ownText + node.children.map((child) => child.textContent).join("");
    },
    set(value) {
      ownText = String(value);
      innerHtml = ownText;
      node.children = [];
    }
  });

  Object.defineProperty(node, "innerHTML", {
    get() {
      return innerHtml;
    },
    set(value) {
      innerHtml = String(value);
      ownText = value ? String(value) : "";
      node.children = [];
    }
  });

  Object.defineProperty(node, "isConnected", {
    get() {
      let current = node;
      while (current) {
        if (current.tagName === "html") return true;
        current = current.parentElement;
      }
      return false;
    }
  });

  Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
  children.forEach((child) => node.appendChild(child));
  return node;
}

function querySelectorFrom(root, selector, selectorMap) {
  const results = querySelectorAllFrom(root, selector, selectorMap);
  return results.length > 0 ? results[0] : null;
}

function querySelectorAllFrom(root, selector, selectorMap = {}) {
  if (selectorMap && selectorMap[selector]) {
    return selectorMap[selector];
  }

  const selectors = selector.split(",").map((part) => part.trim()).filter(Boolean);
  const matches = [];

  walk(root, (node) => {
    if (node === root) return;
    if (selectors.some((part) => matchesSelector(node, part))) {
      matches.push(node);
    }
  });

  return matches;
}

function walk(node, visit) {
  visit(node);
  node.children.forEach((child) => walk(child, visit));
}

function matchesSelector(node, selector) {
  if (!selector) return false;

  if (node.selectors && node.selectors.has(selector)) {
    return true;
  }

  validateSelector(selector);

  if (selector.includes(" ")) {
    return false;
  }

  const attrMatch = selector.match(/^\[([^=\]*]+)([*]?=)?\"?([^\"]*)\"?\]$/);
  if (attrMatch) {
    const [, attrName, operator, expected] = attrMatch;
    const actual = node.getAttribute(attrName);
    if (operator === "*=") {
      return typeof actual === "string" && actual.includes(expected);
    }
    if (operator === "=") {
      return actual === expected;
    }
    return actual !== null;
  }

  if (selector.startsWith(".")) {
    return node.classList.contains(selector.slice(1));
  }

  if (selector.startsWith("#")) {
    return node.id === selector.slice(1);
  }

  const tagAttrMatch = selector.match(/^([a-z0-9-]+)(\[.+\])$/i);
  if (tagAttrMatch) {
    return (
      node.tagName === tagAttrMatch[1].toLowerCase() &&
      matchesSelector(node, tagAttrMatch[2])
    );
  }

  return node.tagName === selector.toLowerCase();
}

function dataAttrToProp(name) {
  return name
    .slice(5)
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function createDeferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function validateSelector(selector) {
  const trimmed = selector.trim();
  if (!trimmed) return;

  let depth = 0;
  for (const char of trimmed) {
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth < 0) {
      throw new Error("Malformed selector: " + selector);
    }
  }

  if (depth !== 0) {
    throw new Error("Malformed selector: " + selector);
  }
}
