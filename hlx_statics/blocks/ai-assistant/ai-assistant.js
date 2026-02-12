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
  const container = createTag("div", { class: "ai-assistant-container" });

  const section = createTag("div", { class: "ai-assistant-section" });
  const label = createTag("h2", { class: "ai-assistant-label" });
  label.textContent = "Adobe Developer AI assistant";
  section.appendChild(label);

  const content = createTag("div", { class: "ai-assistant-content" });
  content.textContent = "Ai Assistant content";
  section.appendChild(content);

  content.appendChild(chatLine("Hello, welcome to Adobe Developer Website!"));
  content.appendChild(chatLine("What would you like to know today?"));

  const chatButton = createTag("button", { class: "chatButton" });
  chatButton.innerHTML = `<img src="/hlx_statics/icons/ai-chat.svg" alt="" aria-hidden="true">`;
  chatButton.ariaLabel = "Open AI Assistant";
  /**
   * TODO: Double check the accessibility of the button.
   *
   * Improvements:
   *   - Change label based on chat window state;
   *   - Add aria-controls attribute to link the button to the chat window;
   *   - Add aria-expanded attribute to indicate the state of the chat window;
   *   - Add aria-haspopup attribute to indicate the type of popup that will be opened by the button;
   */
  container.appendChild(chatButton);

  container.appendChild(section);

  block.appendChild(container);
}
