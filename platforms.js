// ============================================================
// platforms.js
// This file is the "map" of each AI chat website.
// Each platform has different HTML structure, so we define:
//   - messageSelector: how to find each chat message
//   - inputSelector:   how to find the text input box
//   - sendSelector:    how to find the send button
// ============================================================

const PLATFORMS = {

  // --- ChatGPT (chat.openai.com and chatgpt.com) ---
  "chatgpt": {
    // These are the CSS selectors that identify each message bubble
    messageSelector: "[data-message-author-role]",

    // The text input where the user types
    inputSelector: "#prompt-textarea",

    // The send button
    sendSelector: "[data-testid='send-button']",

    // How do we know which messages are from the AI vs the user?
    // We check the "data-message-author-role" attribute on each message
    getRole: (el) => el.getAttribute("data-message-author-role"), // returns "user" or "assistant"

    // How do we get the text content of a message?
    getText: (el) => el.querySelector(".markdown, .text-message, [class*='prose']")?.innerText
      || el.innerText
  },

  // --- Claude (claude.ai) ---
  "claude": {
    messageSelector: "[data-testid='human-turn'], [data-testid='ai-turn']",
    inputSelector: "[contenteditable='true'].ProseMirror, div[contenteditable='true']",
    sendSelector: "button[aria-label='Send message'], button[type='submit']",

    getRole: (el) => {
      if (el.getAttribute("data-testid") === "human-turn") return "user";
      return "assistant";
    },

    getText: (el) => el.querySelector("p, .prose")?.innerText || el.innerText
  },

  // --- Gemini (gemini.google.com) ---
  "gemini": {
    messageSelector: "message-content, user-query-container",
    inputSelector: ".ql-editor[contenteditable='true'], rich-textarea [contenteditable]",
    sendSelector: "button.send-button, button[aria-label='Send message']",

    getRole: (el) => {
  if (el.tagName?.toLowerCase() === "message-content") return "assistant";
  if (el.tagName?.toLowerCase() === "user-query-container") return "user";
  return "assistant";},

   getText: (el) => el.querySelector(".markdown, p")?.innerText || el.innerText
  }

};

// ============================================================
// detectPlatform()
// Looks at the current website URL and returns the right
// platform config from the object above.
// ============================================================
function detectPlatform() {
  const hostname = window.location.hostname;

  if (hostname.includes("chatgpt.com") || hostname.includes("openai.com")) {
    return PLATFORMS["chatgpt"];
  }
  if (hostname.includes("claude.ai")) {
    return PLATFORMS["claude"];
  }
  if (hostname.includes("gemini.google.com")) {
    return PLATFORMS["gemini"];
  }

  // If we don't recognise the site, return null
  // content.js will check for this and do nothing
  return null;
}
