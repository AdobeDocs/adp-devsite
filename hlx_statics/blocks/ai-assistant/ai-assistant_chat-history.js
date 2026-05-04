// @ts-check

/**
 * @typedef {Object} ChatReference
 * @property {string} url
 * @property {string} title
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} [id]
 * @property {string} content
 * @property {'user'|'ai'} source
 * @property {ChatReference[]} [references]
 * @property {string|null|number} [timestamp]
 */

export class ChatHistory {
  static STORAGE_KEY = "ai-assistant-chat-history";

  /** @type {ChatMessage[]|null} */
  _cache = null;

  /**
   * Gets all messages from history
   * @returns {ChatMessage[]}
   */
  getAll() {
    if (this._cache) return [...this._cache]; // Return copy to prevent mutations

    try {
      const stored = sessionStorage.getItem(ChatHistory.STORAGE_KEY);
      if (!stored) {
        this._cache = [];
        return [];
      }
      const parsed = JSON.parse(stored);
      this._cache = this._sanitizeMessages(parsed);
      return [...this._cache];
    } catch (error) {
      console.error("Error retrieving chat history:", error);
      this._cache = [];
      return [];
    }
  }

  /**
   * Adds a new message to history
   * @param {ChatMessage} message
   */
  add(message) {
    const history = this.getAll();
    history.push(message);
    this._save(history);
  }

  /**
   * Updates the last message in history
   * @param {Partial<ChatMessage>} updates - Properties to merge into last message
   */
  updateLast(updates) {
    const history = this.getAll();
    if (history.length > 0) {
      history[history.length - 1] = {
        ...history[history.length - 1],
        ...updates,
      };
      this._save(history);
    }
  }

  /**
   * Finds a message by ID
   * @param {string} id - Message ID to find
   * @returns {ChatMessage|undefined} The message object or undefined
   */
  findById(id) {
    return this.getAll().find((m) => m.id === id);
  }

  /**
   * Gets messages formatted for AI context
   * @param {Object} [options]
   * @param {number} [options.excludeLast=2] - Number of recent messages to exclude (0 = include all)
   * @returns {string} Formatted context string
   */
  getContextForAI({ excludeLast = 2 } = {}) {
    const messages = this.getAll();
    const sliced = excludeLast > 0 ? messages.slice(0, -excludeLast) : messages;
    return sliced
      .map(({ source, content }) => JSON.stringify({ source, content }))
      .join("\n");
  }

  /**
   * Clears all history
   */
  clear() {
    try {
      sessionStorage.removeItem(ChatHistory.STORAGE_KEY);
      this._cache = [];
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  }

  /**
   * Gets the number of messages in history
   * @returns {number}
   */
  get length() {
    return this.getAll().length;
  }

  /**
   * Checks if history is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.length === 0;
  }

  /**
   * Saves history to sessionStorage
   * @param {ChatMessage[]} history - The chat history array to save
   * @private
   */
  _save(history) {
    try {
      const serializable = this._sanitizeMessages(history);
      sessionStorage.setItem(
        ChatHistory.STORAGE_KEY,
        JSON.stringify(serializable),
      );
      this._cache = serializable;
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  }

  /**
   * Sanitizes messages to only include serializable properties
   * @param {ChatMessage[]} messages - Messages to sanitize
   * @returns {ChatMessage[]} Sanitized messages
   * @private
   */
  _sanitizeMessages(messages) {
    return messages.map(({ id, content, source, references, timestamp }) => ({
      ...(id && { id }),
      content,
      source,
      ...(references?.length && { references }),
      ...(timestamp && { timestamp }),
    }));
  }
}

export const chatHistory = new ChatHistory();
