// ============================================================
// content.js
// This is the main script. It runs inside each AI chat page.
//
// What it does:
//   1. Detects which platform we're on (ChatGPT/Claude/Gemini)
//   2. Watches for new messages appearing on the page
//   3. Adds a reply button to each message
//   4. When reply is clicked, shows a quote bar above the input
//   5. When user sends, prepends the quoted message for context
// ============================================================


// ---- STEP 1: Check which platform we're on ----
// detectPlatform() is defined in platforms.js (loaded before this file)
const platform = detectPlatform();

// If we don't recognise the site, stop here and do nothing
if (!platform) {
  console.log("AI Chat Reply: unrecognised platform, extension inactive.");
}


// ---- STEP 2: State — remember what the user has quoted ----
// This object holds the currently quoted message (if any)
let quotedMessage = null; // will be { text, role } or null


// ---- STEP 3: Watch for new messages appearing ----
// Chat apps load messages dynamically (without refreshing the page)
// so we can't just run once — we have to watch for changes.
// MutationObserver is a browser API that fires a callback
// whenever the page's HTML changes.

function startObserver() {
  const observer = new MutationObserver(() => {
    // Every time anything changes on the page, try to add reply buttons
    addReplyButtons();
  });

  // Watch the whole page body for any changes
  observer.observe(document.body, {
    childList: true,   // watch for elements being added/removed
    subtree: true      // watch all descendants, not just direct children
  });

  // Also run once immediately in case messages are already on screen
  addReplyButtons();
}


// ---- STEP 4: Add reply buttons to messages ----
function addReplyButtons() {
  if (!platform) return;

  // Find all message elements on the page using the platform's selector
  const messages = document.querySelectorAll(platform.messageSelector);

  messages.forEach((message) => {

    // Skip if we've already added a button to this message
    // We mark processed messages with a data attribute
    if (message.dataset.replyInjected === "true") return;
    message.dataset.replyInjected = "true";

    // Get the text content of this message
    const text = platform.getText(message);

    // Skip empty messages
    if (!text || text.trim().length === 0) return;

    // Get the role (who sent it — user or assistant)
    const role = platform.getRole(message);

    // Create the reply button element
    const replyBtn = document.createElement("button");
    replyBtn.className = "ai-reply-btn";
    replyBtn.innerHTML = "↩ Reply";
    replyBtn.title = "Quote this message in your reply";

    // What happens when the reply button is clicked
    replyBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // don't bubble the click up to the page
      handleReplyClick(text.trim(), role);
    });

    // Add the button inside the message element
    // We wrap it in a container so we can position it cleanly
    const btnContainer = document.createElement("div");
    btnContainer.className = "ai-reply-btn-container";
    btnContainer.appendChild(replyBtn);
    message.appendChild(btnContainer);
  });
}


// ---- STEP 5: Handle when user clicks reply ----
function handleReplyClick(text, role) {
  // Save the quoted message to our state
  quotedMessage = { text, role };

  // Show the quote bar above the input box
  showQuoteBar(text, role);
}


// ---- STEP 6: Show the quote bar above the input ----
function showQuoteBar(text, role) {

  // Remove any existing quote bar first (user might be switching replies)
  removeQuoteBar();

  // Find the input box using the platform selector
  const input = document.querySelector(platform.inputSelector);
  if (!input) return;

  // Find the input's parent container — we'll insert the bar before the input
  const inputContainer = input.closest("form, [class*='input'], [class*='composer'], footer")
    || input.parentElement;

  if (!inputContainer) return;

  // Create the quote bar element
  const quoteBar = document.createElement("div");
  quoteBar.className = "ai-quote-bar";
  quoteBar.id = "ai-quote-bar";

  // Trim the preview text so it's not too long
  const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;
  const roleLabel = role === "user" ? "You" : "AI";

  quoteBar.innerHTML = `
    <div class="ai-quote-bar-inner">
      <div class="ai-quote-bar-left">
        <span class="ai-quote-bar-role">${roleLabel}</span>
        <span class="ai-quote-bar-text">${escapeHtml(preview)}</span>
      </div>
      <button class="ai-quote-bar-close" id="ai-quote-bar-close" title="Cancel reply">✕</button>
    </div>
  `;

  // Insert the quote bar just before the input container
  inputContainer.parentElement.insertBefore(quoteBar, inputContainer);

  // Wire up the close button
  document.getElementById("ai-quote-bar-close").addEventListener("click", () => {
    removeQuoteBar();
    quotedMessage = null;
  });

  // Focus the input so user can start typing immediately
  input.focus();

  // Listen for the send event so we can prepend the quote
  listenForSend();
}


// ---- STEP 7: Listen for the message being sent ----
// We need to catch the moment the user sends so we can
// prepend the quoted context to their message.
let sendListener = null;

function listenForSend() {
  // Remove any existing listener first
  if (sendListener) {
    document.removeEventListener("keydown", sendListener);
  }

  sendListener = (e) => {
    // Most AI chats send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      if (quotedMessage) {
        // Small delay to let the platform register the keypress first
        setTimeout(() => {
          prependQuoteToInput();
        }, 10);
      }
    }
  };

  document.addEventListener("keydown", sendListener);

  // Also watch the send button
  const sendBtn = document.querySelector(platform.sendSelector);
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      if (quotedMessage) prependQuoteToInput();
    }, { once: true }); // once:true means it only fires once then removes itself
  }
}


// ---- STEP 8: Prepend the quote to the input ----
function prependQuoteToInput() {
  if (!quotedMessage) return;

  const input = document.querySelector(platform.inputSelector);
  if (!input) return;

  // Build the quote prefix text
  // Format: > [quoted text]\n\n[user's message]
  const quotePrefix = `> "${quotedMessage.text}"\n\n`;

  // Getting and setting input text is tricky in React-based apps.
  // We can't just do input.value = "..." because React won't notice.
  // We have to use the native input event system.

  if (input.tagName === "TEXTAREA") {
    // For regular textarea elements (ChatGPT uses this)
    const currentText = input.value;
    const newText = quotePrefix + currentText;

    // Use the native input setter so React registers the change
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    ).set;
    nativeInputSetter.call(input, newText);

    // Dispatch an input event so React knows the value changed
    input.dispatchEvent(new Event("input", { bubbles: true }));

  } else if (input.isContentEditable || input.contentEditable === "true") {
    // For contentEditable divs (Claude and Gemini use these)
    const currentText = input.innerText;
    input.innerText = quotePrefix + currentText;

    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    // Trigger input event
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Clean up — remove quote bar and reset state
  removeQuoteBar();
  quotedMessage = null;
}


// ---- HELPERS ----

// Remove the quote bar from the page
function removeQuoteBar() {
  const existing = document.getElementById("ai-quote-bar");
  if (existing) existing.remove();
}

// Safely escape HTML so quoted text can't inject scripts
function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}


// ---- START ----
// Wait for the page to be ready, then start the observer
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startObserver);
} else {
  startObserver();
}
