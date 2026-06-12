(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBookmarkData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_CACHED_MESSAGES = 20;
  const INCOMING_EVENTS_KEY = "waIncomingMessageEvents";
  const MAX_INCOMING_EVENT_ENTRIES = 50;

  function normalizeBookmarkData(raw) {
    const source = raw || {};

    return {
      chats: Array.isArray(source.chats)
        ? source.chats.map(function (c) {
            return {
              id: c.id,
              name: c.name,
              preview: c.preview || "",
              avatar: c.avatar || null,
              hasUnread: c.hasUnread === true,
              isPinned: c.isPinned === true
            };
          })
        : [],
      messagesByChatId:
        source.messagesByChatId && typeof source.messagesByChatId === "object"
          ? cloneMessagesByChatId(source.messagesByChatId)
          : {},
      updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : 0,
      sourceTabAvailable: source.sourceTabAvailable === true
    };
  }

  function cloneMessagesByChatId(messagesByChatId) {
    return Object.keys(messagesByChatId).reduce(function (accumulator, chatId) {
      accumulator[chatId] = Array.isArray(messagesByChatId[chatId])
        ? messagesByChatId[chatId].slice()
        : [];
      return accumulator;
    }, {});
  }

  function appendCachedMessage(raw, chatId, message) {
    const data = normalizeBookmarkData(raw);
    const existing = Array.isArray(data.messagesByChatId[chatId])
      ? data.messagesByChatId[chatId].slice()
      : [];

    existing.push(message);
    data.messagesByChatId[chatId] = existing.slice(-MAX_CACHED_MESSAGES);

    return data;
  }

  function normalizeIncomingMessageEvents(raw) {
    const source = raw || {};
    const entries = Array.isArray(source.entries)
      ? source.entries
          .map(normalizeIncomingEventEntry)
          .filter(function (entry) {
            return entry.eventId && (entry.text || entry.message);
          })
          .slice(-MAX_INCOMING_EVENT_ENTRIES)
      : [];

    return {
      id: typeof source.id === "string" ? source.id : "",
      createdAt: typeof source.createdAt === "number" ? source.createdAt : 0,
      entries: entries
    };
  }

  function normalizeIncomingEventEntry(raw) {
    const source = raw || {};
    const message =
      source.message && typeof source.message === "object"
        ? clonePlainObject(source.message)
        : null;
    const text =
      typeof source.text === "string" ? source.text : getIncomingEventText({ message: message });
    const chatId = source.chatId == null ? "" : String(source.chatId);
    const contactName = source.contactName == null ? "" : String(source.contactName);
    const eventSource = source.source === "preview" ? "preview" : "message";
    const eventId =
      typeof source.eventId === "string" && source.eventId
        ? source.eventId
        : buildIncomingEventId({
            chatId: chatId,
            contactName: contactName,
            text: text,
            source: eventSource,
            message: message
          });

    return {
      eventId: eventId,
      chatId: chatId,
      contactName: contactName,
      text: text,
      source: eventSource,
      message: message
    };
  }

  function createIncomingMessageEventBatch(entries, createdAt) {
    const normalized = (Array.isArray(entries) ? entries : [])
      .map(normalizeIncomingEventEntry)
      .filter(function (entry) {
        return entry.eventId && (entry.text || entry.message);
      })
      .slice(-MAX_INCOMING_EVENT_ENTRIES);
    const timestamp = typeof createdAt === "number" ? createdAt : Date.now();

    return {
      id:
        String(timestamp) +
        ":" +
        normalized
          .map(function (entry) {
            return entry.eventId;
          })
          .join(","),
      createdAt: timestamp,
      entries: normalized
    };
  }

  function getNewIncomingEventEntries(previousRaw, nextRaw) {
    const previous = normalizeIncomingMessageEvents(previousRaw);
    const next = normalizeIncomingMessageEvents(nextRaw);
    const known = new Set(
      previous.entries.map(function (entry) {
        return entry.eventId;
      })
    );

    return next.entries.filter(function (entry) {
      return !known.has(entry.eventId);
    });
  }

  function getIncomingEventText(entry) {
    const source = entry || {};
    const message = source.message || {};
    const text =
      typeof source.text === "string" && source.text.trim()
        ? source.text.trim()
        : typeof message.text === "string" && message.text.trim()
          ? message.text.trim()
          : typeof message.fallbackText === "string" && message.fallbackText.trim()
            ? message.fallbackText.trim()
            : "";

    if (text) {
      return text;
    }

    if (message.kind && message.kind !== "text") {
      return "[" + String(message.kind).charAt(0).toUpperCase() + String(message.kind).slice(1) + "]";
    }

    return "";
  }

  function buildIncomingEventId(entry) {
    const message = entry.message || {};
    return [
      entry.source || "message",
      entry.chatId || "",
      message.id || "",
      message.timestampLabel || "",
      message.direction || "",
      entry.text || "",
      message.mediaSrc || ""
    ].join("|");
  }

  function clonePlainObject(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return Object.assign({}, value);
    }
  }

  return {
    MAX_CACHED_MESSAGES: MAX_CACHED_MESSAGES,
    INCOMING_EVENTS_KEY: INCOMING_EVENTS_KEY,
    MAX_INCOMING_EVENT_ENTRIES: MAX_INCOMING_EVENT_ENTRIES,
    normalizeBookmarkData: normalizeBookmarkData,
    appendCachedMessage: appendCachedMessage,
    normalizeIncomingMessageEvents: normalizeIncomingMessageEvents,
    createIncomingMessageEventBatch: createIncomingMessageEventBatch,
    getNewIncomingEventEntries: getNewIncomingEventEntries,
    getIncomingEventText: getIncomingEventText
  };
});
