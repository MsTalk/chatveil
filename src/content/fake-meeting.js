(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurFakeMeeting = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  let overlayElement = null;
  let autoCloseTimerId = null;

  async function generateMeeting(template, title, time) {
    if (autoCloseTimerId) {
      clearTimeout(autoCloseTimerId);
      autoCloseTimerId = null;
    }

    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }

    const meetingTitle = title || "Team Sync";
    const meetingTime = time || generateFutureTime();

    overlayElement = document.createElement("div");
    overlayElement.className = "wa-fake-meeting-overlay";
    overlayElement.id = "wa-fake-meeting-overlay";

    const content = renderTemplate(template || "calendar", meetingTitle, meetingTime);
    overlayElement.innerHTML = content;

    document.body.appendChild(overlayElement);

    overlayElement.addEventListener("click", function (event) {
      if (event.target.classList.contains("wa-fake-meeting-close")) {
        closeMeeting();
      }
    });

    autoCloseTimerId = setTimeout(function () {
      closeMeeting();
    }, 15000);
  }

  function closeMeeting() {
    if (autoCloseTimerId) {
      clearTimeout(autoCloseTimerId);
      autoCloseTimerId = null;
    }
    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }
  }

  function generateFutureTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return hours + ":" + minutes;
  }

  function renderTemplate(template, title, time) {
    switch (template) {
      case "zoom":
        return renderZoom(title, time);
      case "outlook":
        return renderOutlook(title, time);
      case "calendar":
      default:
        return renderCalendar(title, time);
    }
  }

  function renderCalendar(title, time) {
    return (
      '<div class="wa-fake-meeting-card wa-fake-meeting-card--calendar">' +
      '<button class="wa-fake-meeting-close">&times;</button>' +
      '<div class="wa-fake-meeting-icon">📅</div>' +
      '<div class="wa-fake-meeting-title">' + escapeHtml(title) + '</div>' +
      '<div class="wa-fake-meeting-time">Today at ' + escapeHtml(time) + '</div>' +
      '<div class="wa-fake-meeting-details">Google Calendar &middot; 30 min</div>' +
      '<div class="wa-fake-meeting-actions">' +
      '<button class="wa-fake-meeting-btn wa-fake-meeting-btn--primary">Join</button>' +
      '<button class="wa-fake-meeting-btn">Maybe</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderZoom(title, time) {
    return (
      '<div class="wa-fake-meeting-card wa-fake-meeting-card--zoom">' +
      '<button class="wa-fake-meeting-close">&times;</button>' +
      '<div class="wa-fake-meeting-icon">📹</div>' +
      '<div class="wa-fake-meeting-title">' + escapeHtml(title) + '</div>' +
      '<div class="wa-fake-meeting-time">Zoom Meeting &middot; ' + escapeHtml(time) + '</div>' +
      '<div class="wa-fake-meeting-details">Meeting ID: 123 456 7890</div>' +
      '<div class="wa-fake-meeting-actions">' +
      '<button class="wa-fake-meeting-btn wa-fake-meeting-btn--primary">Join</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderOutlook(title, time) {
    return (
      '<div class="wa-fake-meeting-card wa-fake-meeting-card--outlook">' +
      '<button class="wa-fake-meeting-close">&times;</button>' +
      '<div class="wa-fake-meeting-icon">📅</div>' +
      '<div class="wa-fake-meeting-title">' + escapeHtml(title) + '</div>' +
      '<div class="wa-fake-meeting-time">Today at ' + escapeHtml(time) + '</div>' +
      '<div class="wa-fake-meeting-details">Microsoft Outlook &middot; 30 min</div>' +
      '<div class="wa-fake-meeting-actions">' +
      '<button class="wa-fake-meeting-btn wa-fake-meeting-btn--primary">Accept</button>' +
      '<button class="wa-fake-meeting-btn">Tentative</button>' +
      '</div>' +
      '</div>'
    );
  }

  function escapeHtml(text) {
    if (!text) {
      return "";
    }

    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    generateMeeting,
    closeMeeting
  };
});
