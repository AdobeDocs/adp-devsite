import { createTag } from "../../scripts/lib-adobeio.js";

const chatBubble = ({ content, source }) => {
  const chatBubble = createTag("div", { class: "chat-bubble" });
  const contentElement = createTag("div", { class: "chat-bubble-content" });
  const isContinuingConversation =
    window.TEMP_CHAT_BUBBLES.at(-1)?.source === source;

  if (source === "ai") {
    if (!isContinuingConversation) {
      chatBubble.appendChild(aiAvatar());
    } else {
      chatBubble.style.paddingLeft = "36px";
    }
  } else {
    chatBubble.classList.add("chat-bubble-user");
  }

  if (!isContinuingConversation && window.TEMP_CHAT_BUBBLES.length > 0) {
    contentElement.style.marginTop = "24px";
  }

  content
    .trim()
    .split("\n")
    .forEach((line) => {
      const lineElement = createTag("p");
      lineElement.textContent = line.trim();
      contentElement.appendChild(lineElement);
    });
  chatBubble.appendChild(contentElement);

  window.TEMP_CHAT_BUBBLES.push({ content, source, element: chatBubble });
  return chatBubble;
};

const aiAvatar = () => {
  return createTag("div", {
    class: "chat-ai-avatar",
    "aria-hidden": true,
  });
};

/**
 * decorates the next-prev
 * @param {Element} block The next-prev block element
 *
 */
export default async function decorate(block) {
  window.TEMP_CHAT_BUBBLES = [];
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

  const chatWindowHeader = createTag("header", { class: "chat-window-header" });
  chatWindowHeader.appendChild(aiAvatar(32));
  const label = createTag("h2", {
    class: "chat-window-label",
    id: CHAT_WINDOW_LABEL_ID,
  });
  label.textContent = "Adobe Developer AI assistant";
  const closeButton = createTag("button", {
    class: "chat-window-close",
    type: "button",
    "aria-label": CHAT_BUTTON_LABEL_CLOSE,
  });
  const closeButtonIcon = createTag("img", {
    src: "/hlx_statics/icons/dismiss.svg",
    alt: "",
    "aria-hidden": true,
  });
  closeButton.appendChild(closeButtonIcon);

  chatWindowHeader.appendChild(label);
  chatWindowHeader.appendChild(closeButton);
  chatWindow.appendChild(chatWindowHeader);

  const content = createTag("div", { class: "chat-window-content" });
  chatWindow.appendChild(content);

  const chatButton = createTag("button", {
    class: "chat-button",
    type: "button",
    "aria-controls": CHAT_WINDOW_ID,
    "aria-expanded": "false",
    "aria-haspopup": "dialog",
  });
  const chatButtonIcon = createTag("img", {
    src: "/hlx_statics/icons/ai-chat.svg",
    alt: "",
    "aria-hidden": true,
  });
  chatButton.appendChild(chatButtonIcon);
  chatButton.ariaLabel = CHAT_BUTTON_LABEL_OPEN;

  container.appendChild(chatButton);
  container.appendChild(chatWindow);
  block.appendChild(container);

  const toggleChatWindow = () => {
    const isOpen = chatWindow.classList.contains("show");

    if (!isOpen && window.TEMP_CHAT_BUBBLES.length === 0) {
      window.setTimeout(() => {
        content.appendChild(
          chatBubble({
            content: "Hello, welcome to Adobe Developer Website!",
            source: "ai",
          }),
        );
      }, 250);
      window.setTimeout(() => {
        content.appendChild(
          chatBubble({
            content: "What would you like to know today?",
            source: "ai",
          }),
        );
      }, 500);
    }

    chatButton.setAttribute("aria-expanded", isOpen ? "false" : "true");
    chatButton.ariaLabel = isOpen
      ? CHAT_BUTTON_LABEL_OPEN
      : CHAT_BUTTON_LABEL_CLOSE;
    chatWindow.classList.toggle("show");
  };

  chatButton.addEventListener("click", toggleChatWindow);
  closeButton.addEventListener("click", toggleChatWindow);
}
