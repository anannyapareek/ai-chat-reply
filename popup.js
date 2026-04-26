// ============================================================
// popup.js
// Handles the settings toggles in the popup panel.
// Saves settings to Chrome's storage so they persist
// even after the browser is closed and reopened.
// ============================================================

// The three platform toggle IDs and their storage keys
const TOGGLES = [
  { id: "toggle-chatgpt", key: "enabled_chatgpt" },
  { id: "toggle-claude",  key: "enabled_claude"  },
  { id: "toggle-gemini",  key: "enabled_gemini"  }
];

// ---- When popup opens: load saved settings ----
// chrome.storage.sync saves settings to the user's Google account
// so they sync across devices automatically
document.addEventListener("DOMContentLoaded", () => {

  // Get all saved settings at once
  const keys = TOGGLES.map(t => t.key);

  chrome.storage.sync.get(keys, (savedSettings) => {
    TOGGLES.forEach(({ id, key }) => {
      const checkbox = document.getElementById(id);
      if (!checkbox) return;

      // If we have a saved value, use it. Otherwise default to true (enabled).
      const isEnabled = savedSettings[key] !== undefined
        ? savedSettings[key]
        : true;

      checkbox.checked = isEnabled;

      // Listen for the user flipping the toggle
      checkbox.addEventListener("change", () => {
        // Save the new value
        chrome.storage.sync.set({ [key]: checkbox.checked });
      });
    });
  });

});
