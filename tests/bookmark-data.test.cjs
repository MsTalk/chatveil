const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

test("normalizeBookmarkData backfills missing message cache fields", () => {
  const api = loadBookmarkDataApi();
  const result = api.normalizeBookmarkData({
    chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null }],
    updatedAt: 123
  });

  assert.deepEqual(result, {
    chats: [{ id: "chat-1", name: "Alice", preview: "", avatar: null, hasUnread: false, isPinned: false }],
    messagesByChatId: {},
    updatedAt: 123,
    sourceTabAvailable: false
  });
});

test("appendCachedMessage keeps only the newest 20 messages per chat", () => {
  const api = loadBookmarkDataApi();
  let data = api.normalizeBookmarkData();

  for (let i = 0; i < 22; i += 1) {
    data = api.appendCachedMessage(data, "chat-1", {
      id: "msg-" + i,
      text: "message " + i,
      direction: i % 2 === 0 ? "incoming" : "outgoing",
      timestampLabel: "10:" + String(i).padStart(2, "0")
    });
  }

  assert.equal(data.messagesByChatId["chat-1"].length, 20);
  assert.equal(data.messagesByChatId["chat-1"][0].id, "msg-2");
  assert.equal(data.messagesByChatId["chat-1"][19].id, "msg-21");
});

function loadBookmarkDataApi() {
  return require(path.join(__dirname, "..", "src", "shared", "bookmark-data.js"));
}
