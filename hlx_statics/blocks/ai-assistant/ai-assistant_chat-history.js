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
 * @property {{type: 'THUMBS_UP_DOWN'; score: 0|1}} [feedback]
 */

/**
 * @typedef {Object} SuggestedQuestion
 * @property {string} label
 * @property {string} question
 * @property {string|null} [id]
 */

/**
 * A single conversation: its messages plus the suggested questions currently
 * associated with it. Bundling them keeps suggestions tied to the conversation,
 * which makes supporting multiple switchable conversations straightforward later.
 * @typedef {Object} Conversation
 * @property {ChatMessage[]} messages
 * @property {SuggestedQuestion[]|null} suggestedQuestions
 */

export class ChatHistory {
  static STORAGE_KEY = "ai-assistant-chat-history";

  /** @type {Conversation|null} */
  _cache = null;

  /**
   * Loads the conversation from cache or sessionStorage.
   * @returns {Conversation}
   * @private
   */
  _getConversation() {
    if (this._cache) return this._cache;

    try {
      const stored = sessionStorage.getItem(ChatHistory.STORAGE_KEY);
      if (!stored) {
        this._cache = this._emptyConversation();
        return this._cache;
      }
      const parsed = JSON.parse(stored);
      this._cache = {
        messages: this._sanitizeMessages(parsed?.messages ?? []),
        suggestedQuestions: parsed?.suggestedQuestions ?? null,
      };
      return this._cache;
    } catch (error) {
      console.error("Error retrieving chat history:", error);
      this._cache = this._emptyConversation();
      return this._cache;
    }
  }

  /**
   * @returns {Conversation}
   * @private
   */
  _emptyConversation() {
    return { messages: [], suggestedQuestions: null };
  }

  /**
   * Gets all messages from history
   * @returns {ChatMessage[]}
   */
  getAll() {
    return [...this._getConversation().messages]; // Copy to prevent mutations
  }

  /**
   * Adds a new message to history
   * @param {ChatMessage} message
   */
  add(message) {
    const conversation = this._getConversation();
    this._save({
      ...conversation,
      messages: [...conversation.messages, message],
    });
  }

  /**
   * Updates the last message in history
   * @param {Partial<ChatMessage>} updates - Properties to merge into last message
   */
  updateLast(updates) {
    const conversation = this._getConversation();
    const messages = [...conversation.messages];
    if (messages.length > 0) {
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        ...updates,
      };
      this._save({ ...conversation, messages });
    }
  }

  /**
   * Updates a message by ID
   * @param {string} id - Message ID to update
   * @param {Partial<ChatMessage>} updates - Properties to merge into the message
   * @returns {boolean} True if the message was found and updated
   */
  updateById(id, updates) {
    const conversation = this._getConversation();
    const messages = [...conversation.messages];
    const index = messages.findIndex((m) => m.id === id);
    if (index === -1) return false;
    messages[index] = { ...messages[index], ...updates };
    this._save({ ...conversation, messages });
    return true;
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
   * Gets the suggested questions associated with the current conversation.
   * @returns {SuggestedQuestion[]|null}
   */
  getSuggestedQuestions() {
    return this._getConversation().suggestedQuestions ?? null;
  }

  /**
   * Sets the suggested questions associated with the current conversation.
   * @param {SuggestedQuestion[]} questions
   */
  setSuggestedQuestions(questions) {
    const conversation = this._getConversation();
    this._save({ ...conversation, suggestedQuestions: questions });
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
      this._cache = this._emptyConversation();
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
   * Saves the conversation to sessionStorage
   * @param {Conversation} conversation - The conversation to save
   * @private
   */
  _save(conversation) {
    try {
      const serializable = {
        messages: this._sanitizeMessages(conversation.messages),
        suggestedQuestions: conversation.suggestedQuestions ?? null,
      };
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
    return messages.map(
      ({ id, content, source, references, timestamp, feedback }) => ({
        ...(id && { id }),
        content,
        source,
        ...(references?.length && { references }),
        ...(timestamp && { timestamp }),
        ...(feedback && { feedback }),
      }),
    );
  }
}

export const chatHistory = new ChatHistory();
