# AI Search Summary — How It Works

## Use case:

When a user searches the Adobe Developer using local search, an AI-generated summary appears above the results to help them find what they need faster: [AI Summary](https://diane-ai-week-runtime--adp-devsite--adobedocs.aem.page/app-builder/)

---

## Flow

```
User types a search query
        │
        ▼
Filtered to one product?
        │
   Yes  │  No ──────────────────► Nothing happens
        │
        ▼
Top 3 search results collected
        │
        ▼
POST request sent to Adobe I/O Runtime
  { query, hits: [ title, url, content ] }
        │
        ▼
I/O Runtime action (Node.js)
  • Builds a prompt from the query + top 3 hits
  • Calls Azure OpenAI
        │
        ▼
Azure OpenAI generates a 1–2 sentence summary
  with Markdown links to the most relevant docs
        │
        ▼
I/O Runtime returns { summary: "..." }
        │
        ▼
Summary renders in the search panel
  above the results list
```

---

## The Three Pieces

| Piece | What it does |
|---|---|
| **header.js** | Detects the search query + filters, calls I/O Runtime, renders the summary |
| **I/O Runtime action** | Serverless Node.js function — builds the prompt and calls Azure OpenAI |
| **Azure OpenAI** | Generates the summary text with links to real doc pages |

---

## Why I/O Runtime?

The Azure API key can't live in the browser — anyone could extract it from the JavaScript. I/O Runtime acts as a secure middleman: the browser never touches Azure directly.

```
Browser (header.js)  ──►  I/O Runtime  ──►  Azure OpenAI
       ▲                      │
       └──── summary ─────────┘
```

---

## Key Details

- Only fires when **exactly one product** is selected — avoids noisy multi-product results
- Cancels in-flight requests if the user clears the search or changes filters
- Links in the summary are validated — only URLs from the actual search results are rendered as links
