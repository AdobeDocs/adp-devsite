const { AzureOpenAI } = require('openai');

async function main(params) {
  if (params.__ow_method === 'options') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  const { query, hits } = params;
  if (!query || !Array.isArray(hits) || hits.length === 0) {
    
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing query or hits' }),
    };
  }

  const client = new AzureOpenAI({
    endpoint: params.AZURE_OPENAI_ENDPOINT,
    apiKey: params.AZURE_OPENAI_API_KEY,
    apiVersion: '2024-10-21',
    deployment: params.AZURE_OPENAI_DEPLOYMENT,
  });

  const top = hits.slice(0, 3);
  const ex = top[0];
  const linkExample = ex
    ? `Example pattern (use only URLs from the list): …see [${ex.title}](${ex.url}) for …`
    : '';

  // Shown in the UI — JSON.stringify so quotes/newlines in the search term don’t break the sentence
  const queryQuoted = JSON.stringify(String(query));
  const opening = `Based on your query: ${queryQuoted} you are most likely looking for `;

  const prompt = `You are a helpful assistant for Adobe developer documentation.
  The user’s search was: ${queryQuoted}

  Here are the top matching pages:
  ${top.map((h) => `- ${h.title} (${h.url}): ${h.content}`).join('\n')}

  The first sentence of the final UI is fixed in code: it will read like "Based on your query: " plus the user’s search term, plus " you are most likely looking for" — you must not output that sentence. Your reply must be ONLY the continuation: one or two more sentences (concise, technical) that complete the thought. It should say what the developer is after and the best doc(s) to use.

  Linking rules for your continuation only:
  - Do not paste raw URLs; use Markdown links: [label](full_url) using exact URLs from the list.
  - You may use up to two links.
  ${linkExample ? `- ${linkExample}\n` : ''}
  - Do not repeat the opening, do not use a title line, and do not add quotes around your whole answer. Start your reply with the next word after the opening (e.g. "information" or "guidance"), not a newline.`;

  // Full user message sent to the model (only top 3 hits are in the prompt, not all hits)
  console.log('[ai-summary] prompt sent to model:\n', prompt);

  const response = await client.chat.completions.create({
    model: params.AZURE_OPENAI_DEPLOYMENT,
    max_completion_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const choice = response.choices[0];
  console.log('[ai-summary] finish_reason:', choice.finish_reason);
  console.log('[ai-summary] content:', choice.message.content);
  console.log('[ai-summary] content_filter_results:', JSON.stringify(choice.content_filter_results ?? 'n/a'));

  let continuation = (choice.message.content || '').trim();
  // If the model repeated the fixed opening, drop it (prefix is always applied in code)
  if (continuation.startsWith(opening.trim())) {
    continuation = continuation.slice(opening.trim().length).trim();
  }
  const summary = opening + continuation;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ summary }),
  };
}

module.exports = { main };
