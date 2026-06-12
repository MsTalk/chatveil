(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurDashboardData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STORAGE_KEY = "waPrivacyBlurDashboard";
  const BOOKMARK_DATA_KEY = "waBookmarkBarData";
  const MAX_MESSAGES_PER_DAY = 200;

  function normalizeDashboardData(raw) {
    const data = raw || {};
    return {
      dailyStats: data.dailyStats || {},
      emojiStats: data.emojiStats || {},
      lastUpdated: data.lastUpdated || 0
    };
  }

  async function readDashboardData() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return normalizeDashboardData(result[STORAGE_KEY]);
    } catch (error) {
      return normalizeDashboardData();
    }
  }

  async function writeDashboardData(data) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: normalizeDashboardData(data)
      });
    } catch (error) {
      // ignore
    }
  }

  function getTodayKey() {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function extractEmojis(text) {
    if (!text || typeof text !== "string") {
      return [];
    }

    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2B06}]|[\u{2B07}]|[\u{2B05}]|[\u{27A1}]|[\u{2194}-\u{2199}]|[\u{21A9}-\u{21AA}]|[\u{2934}-\u{2935}]|[\u{25AA}-\u{25AB}]|[\u{25FB}-\u{25FE}]|[\u{25FD}-\u{25FE}]|[\u{2B50}]|[\u{2B55}]|[\u{2328}]|[\u{23CF}]|[\u{24C2}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]|[\u{1F600}-\u{1F636}]|[\u{1F681}-\u{1F6C5}]|[\u{1F30D}-\u{1F567}]/gu;
    const matches = text.match(emojiRegex);
    return matches || [];
  }

  async function recordMessage(contact, direction, text, timestamp) {
    const data = await readDashboardData();
    const today = getTodayKey();

    if (!data.dailyStats[today]) {
      data.dailyStats[today] = {
        totalMessages: 0,
        incomingMessages: 0,
        outgoingMessages: 0,
        contacts: {}
      };
    }

    const dayStats = data.dailyStats[today];
    dayStats.totalMessages += 1;

    if (direction === "incoming") {
      dayStats.incomingMessages += 1;
    } else if (direction === "outgoing") {
      dayStats.outgoingMessages += 1;
    }

    const contactKey = contact || "Unknown";
    if (!dayStats.contacts[contactKey]) {
      dayStats.contacts[contactKey] = {
        messageCount: 0,
        lastMessage: "",
        lastTimestamp: 0
      };
    }

    dayStats.contacts[contactKey].messageCount += 1;
    dayStats.contacts[contactKey].lastMessage = text || "";
    dayStats.contacts[contactKey].lastTimestamp = timestamp || Date.now();

    const emojis = extractEmojis(text);
    emojis.forEach(function (emoji) {
      data.emojiStats[emoji] = (data.emojiStats[emoji] || 0) + 1;
    });

    data.lastUpdated = Date.now();
    await writeDashboardData(data);
  }

  function getStats(data) {
    const normalized = normalizeDashboardData(data);
    const today = getTodayKey();
    const todayStats = normalized.dailyStats[today] || {
      totalMessages: 0,
      incomingMessages: 0,
      outgoingMessages: 0,
      contacts: {}
    };

    let totalMessages = 0;
    let totalIncoming = 0;
    let totalOutgoing = 0;

    Object.keys(normalized.dailyStats).forEach(function (day) {
      const dayData = normalized.dailyStats[day];
      totalMessages += dayData.totalMessages || 0;
      totalIncoming += dayData.incomingMessages || 0;
      totalOutgoing += dayData.outgoingMessages || 0;
    });

    return {
      today: todayStats,
      totalMessages: totalMessages,
      totalIncoming: totalIncoming,
      totalOutgoing: totalOutgoing,
      activeContacts: Object.keys(todayStats.contacts).length,
      lastUpdated: normalized.lastUpdated
    };
  }

  function getTopContacts(data, n) {
    const normalized = normalizeDashboardData(data);
    const today = getTodayKey();
    const todayStats = normalized.dailyStats[today];

    if (!todayStats || !todayStats.contacts) {
      return [];
    }

    return Object.keys(todayStats.contacts)
      .map(function (name) {
        return {
          name: name,
          messageCount: todayStats.contacts[name].messageCount || 0
        };
      })
      .sort(function (a, b) {
        return b.messageCount - a.messageCount;
      })
      .slice(0, n || 5);
  }

  function getEmojiRanking(data, n) {
    const normalized = normalizeDashboardData(data);
    return Object.keys(normalized.emojiStats)
      .map(function (emoji) {
        return {
          emoji: emoji,
          count: normalized.emojiStats[emoji] || 0
        };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, n || 5);
  }

  function summarizeBookmarkData(raw) {
    const source = raw || {};
    const chats = Array.isArray(source.chats) ? source.chats : [];
    const messagesByChatId =
      source.messagesByChatId && typeof source.messagesByChatId === "object"
        ? source.messagesByChatId
        : {};
    const contactCounts = {};
    const emojiCounts = {};
    let totalMessages = 0;
    let incomingMessages = 0;
    let outgoingMessages = 0;

    chats.forEach(function (chat) {
      const messages = Array.isArray(messagesByChatId[chat.id])
        ? messagesByChatId[chat.id]
        : [];
      contactCounts[chat.name || chat.id] = messages.length;

      messages.forEach(function (message) {
        totalMessages += 1;
        if (message && (message.isOutgoing === true || message.direction === "outgoing")) {
          outgoingMessages += 1;
        } else {
          incomingMessages += 1;
        }

        extractEmojis(message && message.text).forEach(function (emoji) {
          emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
        });
      });
    });

    const topContactEntry = Object.keys(contactCounts)
      .map(function (name) {
        return { name: name, count: contactCounts[name] };
      })
      .sort(function (left, right) {
        return right.count - left.count;
      })[0];
    const topEmojiEntry = Object.keys(emojiCounts)
      .map(function (emoji) {
        return { emoji: emoji, count: emojiCounts[emoji] };
      })
      .sort(function (left, right) {
        return right.count - left.count;
      })[0];

    return {
      totalMessages: totalMessages,
      incomingMessages: incomingMessages,
      outgoingMessages: outgoingMessages,
      activeChats: chats.filter(function (chat) {
        return Array.isArray(messagesByChatId[chat.id]) && messagesByChatId[chat.id].length > 0;
      }).length,
      unreadChats: chats.filter(function (chat) {
        return chat && chat.hasUnread === true;
      }).length,
      topContact: topContactEntry ? topContactEntry.name : "",
      topContactMessages: topContactEntry ? topContactEntry.count : 0,
      topEmoji: topEmojiEntry ? topEmojiEntry.emoji : "",
      topEmojiCount: topEmojiEntry ? topEmojiEntry.count : 0,
      updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : 0
    };
  }

  function getNewIncomingMessages(previousRaw, nextRaw) {
    if (!previousRaw || !nextRaw) {
      return [];
    }

    const previousMessages =
      previousRaw.messagesByChatId && typeof previousRaw.messagesByChatId === "object"
        ? previousRaw.messagesByChatId
        : {};
    const nextMessages =
      nextRaw.messagesByChatId && typeof nextRaw.messagesByChatId === "object"
        ? nextRaw.messagesByChatId
        : {};
    const chatNames = (Array.isArray(nextRaw.chats) ? nextRaw.chats : []).reduce(
      function (accumulator, chat) {
        if (chat && chat.id) {
          accumulator[chat.id] = chat.name || chat.id;
        }
        return accumulator;
      },
      {}
    );
    const previousChatIdsByName = (Array.isArray(previousRaw.chats) ? previousRaw.chats : []).reduce(
      function (accumulator, chat) {
        if (chat && chat.id && chat.name && !accumulator[chat.name]) {
          accumulator[chat.name] = chat.id;
        }
        return accumulator;
      },
      {}
    );
    const additions = [];

    Object.keys(nextMessages).forEach(function (chatId) {
      const previousChatId = Object.prototype.hasOwnProperty.call(previousMessages, chatId)
        ? chatId
        : previousChatIdsByName[chatNames[chatId]];
      if (
        !previousChatId ||
        !Object.prototype.hasOwnProperty.call(previousMessages, previousChatId)
      ) {
        return;
      }

      const known = new Set(
        (Array.isArray(previousMessages[previousChatId]) ? previousMessages[previousChatId] : []).map(
          getMessageFingerprint
        )
      );

      (Array.isArray(nextMessages[chatId]) ? nextMessages[chatId] : []).forEach(
        function (message) {
          if (
            !message ||
            message.isOutgoing === true ||
            message.direction === "outgoing" ||
            known.has(getMessageFingerprint(message))
          ) {
            return;
          }

          additions.push({
            chatId: chatId,
            contactName: chatNames[chatId] || chatId,
            message: message
          });
        }
      );
    });

    return additions;
  }

  function getMessageFingerprint(message) {
    if (message && message.id) {
      return "id:" + message.id;
    }

    return [
      message && message.timestampLabel,
      message && message.direction,
      message && message.sender,
      message && message.text,
      message && message.mediaSrc
    ].join("|");
  }

  return {
    STORAGE_KEY,
    BOOKMARK_DATA_KEY,
    normalizeDashboardData,
    readDashboardData,
    writeDashboardData,
    recordMessage,
    getStats,
    getTopContacts,
    getEmojiRanking,
    summarizeBookmarkData,
    getNewIncomingMessages
  };
});
