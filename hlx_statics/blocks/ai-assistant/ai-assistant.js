import { createTag } from "../../scripts/lib-adobeio.js";

const chatLine= (content) => {
  const chatLine = createTag('div', { class: 'chat-line' });
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

  const section = createTag("div", { class: 'ai-assistant-section' });
  const label = createTag("h2", { class: "ai-assistant-label" });
  label.textContent = "Adobe Developer AI assistant";
  section.appendChild(label);

  const content = createTag("div", { class: "ai-assistant-content" });
  content.textContent = "Ai Assistant content";
  section.appendChild(content);

  content.appendChild(chatLine("Hello, welcome to Adobe Developer Website!"));
  content.appendChild(chatLine("What would you like to know today?"));
  block.appendChild(section);
}
