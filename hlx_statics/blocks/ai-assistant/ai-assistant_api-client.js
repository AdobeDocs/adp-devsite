// @ts-check
import { AI_API_BASE_URL, AI_API_KEY } from "./ai-assistant_constants.js";

/**
 * @typedef {Object} RequestBody
 * @property {string} query
 * @property {string} [collectionId]
 */

/**
 * @typedef {Object} MetadataEvent
 * @property {'metadata'} type
 * @property {string} sessionId
 * @property {string} requestId
 * @property {string} vendorRequestId
 * @property {string|null} collectionId
 */

/**
 * @typedef {Object} ContentEvent
 * @property {'content'} type
 * @property {string} text
 */

/**
 * @typedef {Object} TimingEvent
 * @property {'timing'} type
 * @property {string} metric
 * @property {number} value
 */

/**
 * @typedef {Object} RetrievedReferenceMetadata
 * @property {string} url
 * @property {string} collectionId
 * @property {string} [title]
 * @property {string[]} [keywords]
 */

/**
 * @typedef {Object} RetrievedReference
 * @property {string} content
 * @property {RetrievedReferenceMetadata} metadata
 */

/**
 * @typedef {Object} Citation
 * @property {string} generatedResponsePart
 * @property {RetrievedReference[]} retrievedReferences
 */

/**
 * @typedef {Object} CitationEvent
 * @property {'citation'} type
 * @property {Citation} citation
 */

/**
 * @typedef {Object} CompleteTimingData
 * @property {number} vendorCommand
 * @property {number} timeToFirstToken
 * @property {number} streamingTime
 * @property {number} total
 */

/**
 * @typedef {Object} CompleteEvent
 * @property {'complete'} type
 * @property {CompleteTimingData} timingDataMs
 */

/**
 * @typedef {Object} StreamRequestCallbacks
 * @property {(event: MetadataEvent) => void} onMetadata
 * @property {(event: ContentEvent) => void} onContent
 * @property {(event: CitationEvent) => void} onCitation
 * @property {(event: TimingEvent) => void} onTiming
 * @property {(event?: CompleteEvent) => void} onComplete
 * @property {(error: unknown) => void} onError
 */

export class AiApiClient {
  static STREAMING_ENDPOINT = "/v1/inference/retrieve/generate/stream";
  static NON_STREAMING_ENDPOINT = "/v1/inference/retrieve/generate";
  static COLLECTIONS_ENDPOINT = "/v1/inference/collections";
  /**
   * @param {Object} config
   * @param {string} config.baseUrl
   * @param {string} config.apiKey
   */
  constructor({ baseUrl, apiKey }) {
    if (!baseUrl || !apiKey) {
      throw new Error("AiApiClient requires both baseUrl and apiKey");
    }
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.abortController = null;
    this._collectionsPromise = null;
  }

  /**
   * Fetches available collections from the RAG API.
   * Result is memoized on this instance — at most one network call is made per page load.
   * @returns {Promise<Array<{id: string, name: string, description: string, referencedCollectionIds?: string[]}>>}
   */
  getCollections() {
    if (this._collectionsPromise) return this._collectionsPromise;

    this._collectionsPromise = fetch(
      `${this.baseUrl}${AiApiClient.COLLECTIONS_ENDPOINT}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
      },
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Collections fetch failed: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        console.warn("[AI Assistant] Failed to fetch collections:", err);
        // Do NOT reset _collectionsPromise — one call per page load, even on error.
        return [];
      });

    return this._collectionsPromise;
  }

  /**
   * Makes a streaming request to the AI endpoint
   * @param {Partial<StreamRequestCallbacks> & { body: RequestBody }} options
   * @returns {Promise<void>}
   */
  async streamRequest({
    body,
    onMetadata = () => {},
    onContent = () => {},
    onCitation = () => {},
    onTiming = () => {},
    onComplete = () => {},
    onError = () => {},
  }) {
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    try {
      const response = await fetch(
        `${this.baseUrl}${AiApiClient.STREAMING_ENDPOINT}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": this.apiKey,
          },
          body: JSON.stringify(body),
          signal,
        },
      );

      if (!response.ok || !response.body) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        // @ts-expect-error - status is not a known property on Error, maybe we should use ErrorOptions to store it instead
        error.status = response.status;
        onError(error);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const event = line.replace("data: ", "").trim();
            if (event.length === 0) continue;

            try {
              const data = JSON.parse(event);

              switch (data.type) {
                case "metadata":
                  onMetadata(data);
                  break;
                case "content":
                  onContent(data);
                  break;
                case "citation":
                  onCitation(data);
                  break;
                case "timing":
                  onTiming(data);
                  break;
                case "complete":
                  onComplete(data);
                  return;
                default:
                  console.warn(
                    `[AiApiClient] Unknown event type: ${data.type}`,
                  );
              }
            } catch (parseError) {
              console.error("[AiApiClient] Error parsing event:", parseError);
              onError(parseError);
              return;
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        onComplete();
        return;
      }
      console.error("[AiApiClient] Stream request error:", error);
      onError(error);
    } finally {
      this.abortController = null;
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Makes a non-streaming query and returns the full response text.
   * Used for background tasks like generating suggested questions.
   * @param {Object} options
   * @param {string} options.query - The query to send
   * @param {string} [options.context] - Optional conversation context/history
   * @param {string} [options.systemPrompt] - Optional system prompt
   * @returns {Promise<string>} The generated text response
   */
  async collectResponse({ query, context = "", systemPrompt = "" }) {
    const body = {
      query: `
        <system>
          ${systemPrompt}
        </system>
        ${context ? `<history>\n${context}\n</history>` : ""}
        <question>
          ${query}
        </question>
      `,
    };

    const response = await fetch(
      `${this.baseUrl}${AiApiClient.NON_STREAMING_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.generatedText || "";
  }

  /**
   * Makes a query request with conversation history
   * @param {Object} options - Query options
   * @param {string} options.query - The user's query
   * @param {string} [options.context] - Optional conversation context/history
   * @param {string} [options.systemPrompt] - Optional system prompt instructions
   * @param {string|null} [options.collectionId] - Optional collection ID for the query
   * @param {Partial<StreamRequestCallbacks>} options.callbacks
   * @returns {Promise<void>}
   */
  async query({
    query,
    context = "",
    systemPrompt = "",
    collectionId = null,
    callbacks = {},
  }) {
    const defaultSystemPrompt = `
      Use markdown formatting for the response.
    `;

    /** @type {RequestBody} */
    const body = {
      query: `
        <system>
          ${systemPrompt || defaultSystemPrompt}
        </system>
        ${context ? `<history>\n${context}\n</history>` : ""}
        <question>
          ${query}
        </question>
      `,
    };
    if (collectionId) {
      body.collectionId = collectionId;
    }

    return this.streamRequest({
      body,
      ...callbacks,
    });
  }
}

export const aiApiClient = new AiApiClient({
  baseUrl: AI_API_BASE_URL,
  apiKey: AI_API_KEY,
});
