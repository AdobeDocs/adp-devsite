/**
 * Local test server for the ai-summary action.
 * Reads Azure credentials from environment variables.
 *
 * Usage:
 *   export AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
 *   export AZURE_OPENAI_API_KEY=<your-key>
 *   export AZURE_OPENAI_DEPLOYMENT=<deployment-name>
 *   node local-server.js
 *
 * Then open the site locally — fetchAiSummary in header.js points to http://localhost:3001
 */

const http = require('http');
const { main } = require('./index');

const PORT = 3002;

http
  .createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        // Inject Azure credentials from env, mimicking I/O Runtime default params
        const params = {
          ...parsed,
          __ow_method: 'post',
          AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
          AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
          AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
        };
        const result = await main(params);
        res.writeHead(result.statusCode || 200, { 'Content-Type': 'application/json' });
        res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
      } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  })
  .listen(PORT, () => {
    console.log(`AI Summary local server running on http://localhost:${PORT}`);
    console.log('AZURE_OPENAI_ENDPOINT  :', process.env.AZURE_OPENAI_ENDPOINT ? 'configured' : 'NOT SET');
    console.log('AZURE_OPENAI_API_KEY   :', process.env.AZURE_OPENAI_API_KEY ? 'configured' : 'NOT SET');
    console.log('AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT ? 'configured' : 'NOT SET');
  });
