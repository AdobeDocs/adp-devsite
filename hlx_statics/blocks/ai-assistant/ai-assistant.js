import { createTag } from "../../scripts/lib-adobeio.js";

const chatLine = (content) => {
  const chatLine = createTag("div", { class: "chat-line" });
  chatLine.innerHTML = `
    <div class="chat-line-content">
      <div class="chat-line-content-header">
        <div class="chat-line-content-header-left">
          <div class="chat-line-content-header-left-avatar">
            <img src="/hlx_statics/icons/avatar.svg" alt="Avatar">
          </div>
        </div>
      </div>
      <div class="chat-line-content-body">
        <div class="chat-line-content-body-text">
          <p>${content}</p>
        </div>
      </div>
    `;

  return chatLine;
};

/**
 * decorates the next-prev
 * @param {Element} block The next-prev block element
 *
 */
export default async function decorate(block) {
  const CHAT_BUTTON_LABEL_OPEN = "Open AI Assistant";
  const CHAT_BUTTON_LABEL_CLOSE = "Close AI Assistant";
  const CHAT_WINDOW_ID = "ai-assistant-chat-window";
  const CHAT_WINDOW_LABEL_ID = "ai-assistant-label";

  const container = createTag("div", { class: "ai-assistant-container" });

  const chatWindow = createTag("div", {
    class: "chat-window",
    id: CHAT_WINDOW_ID,
    role: "dialog",
    "aria-modal": "false",
    "aria-labelledby": CHAT_WINDOW_LABEL_ID,
  });
  const label = createTag("h2", {
    class: "chat-window-label",
    id: CHAT_WINDOW_LABEL_ID,
  });
  label.textContent = "Adobe Developer AI assistant";
  chatWindow.appendChild(label);

  const content = createTag("div", { class: "chat-window-content" });
  content.textContent = "Ai Assistant content";
  chatWindow.appendChild(content);

  content.appendChild(chatLine("Hello, welcome to Adobe Developer Website!"));
  content.appendChild(chatLine("What would you like to know today?"));

  const chatButton = createTag("button", {
    class: "chat-button",
    type: "button",
    "aria-controls": CHAT_WINDOW_ID,
    "aria-expanded": "false",
    "aria-haspopup": "dialog",
  });
  const buttonIcon = createTag("img", {
    src: "/hlx_statics/icons/ai-chat.svg",
    alt: "",
    ariaHidden: true,
  });
  chatButton.appendChild(buttonIcon);
  chatButton.ariaLabel = CHAT_BUTTON_LABEL_OPEN;

  container.appendChild(chatButton);
  container.appendChild(chatWindow);
  block.appendChild(container);

  const toggleChatWindow = () => {
    const chatWindow = document.querySelector(
      ".ai-assistant-container .chat-window",
    );
    const isOpen = chatWindow.classList.contains("show");

    // Update aria-expanded to reflect new state
    chatButton.setAttribute("aria-expanded", isOpen ? "false" : "true");

    // Update button label for screen readers
    chatButton.ariaLabel = isOpen
      ? CHAT_BUTTON_LABEL_OPEN
      : CHAT_BUTTON_LABEL_CLOSE;
    chatWindow.classList.toggle("show");
  };

  chatButton.addEventListener("click", toggleChatWindow);
}
