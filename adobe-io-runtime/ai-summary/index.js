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

  const prompt = `You are a helpful assistant for Adobe developer documentation.
A developer searched for: "${query}"

Here are the top matching pages:
${hits.slice(0, 3).map((h) => `- ${h.title} (${h.url}): ${h.content}`).join('\n')}

In 2-3 sentences, summarize what this developer is likely trying to do and which result(s) are most relevant. Be concise and technical. Include URLs as a way to point developers in the right direction to what site they want to go to.`;

  const response = await client.chat.completions.create({
    model: params.AZURE_OPENAI_DEPLOYMENT,
    max_completion_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const choice = response.choices[0];
  console.log('[ai-summary] finish_reason:', choice.finish_reason);
  console.log('[ai-summary] content:', choice.message.content);
  console.log('[ai-summary] content_filter_results:', JSON.stringify(choice.content_filter_results ?? 'n/a'));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ summary: choice.message.content }),
  };
}

module.exports = { main };
