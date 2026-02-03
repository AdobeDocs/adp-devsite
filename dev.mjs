import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import JSZip from 'jszip';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.DEV_PORT || 3000;

const corsOptions = {
  origin: 'http://127.0.0.1:3000/',
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));

let devsitePaths = {};
// TODO: should this switch between stage/prod version of this file or always pull from stage?
const devsitePathsUrl = `https://main--adp-devsite-stage--adobedocs.aem.page/franklin_assets/devsitepaths.json`;

// Function to fetch devsite paths
async function fetchDevsitePaths() {
  try {
    console.log(`Fetching devsite paths from: ${devsitePathsUrl}`);
    const response = await fetch(devsitePathsUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    devsitePaths = data?.data || {};
    console.log(`Successfully loaded ${Object.keys(devsitePaths).length} devsite paths`);
    return devsitePaths;
  } catch (error) {
    console.error(`Failed to fetch devsite paths: ${error.message}`);
    // Set empty object as fallback so server can still run
    devsitePaths = {};
    return devsitePaths;
  }
}

// Initialize devsite paths when server starts
let isInitialized = false;

// ============================================================================
// API ENDPOINT: Download modified ZIP with JSON file added
// ============================================================================
// This must be BEFORE any catch-all middleware
app.post('/api/download-zip', express.json(), async (req, res) => {
  try {
    const { 
      zipPath,           // URL to zip file (e.g., GitHub raw URL)
      jsonContent,       // JSON content to add to the zip
      jsonFileName = 'credential.json',  // Name for the JSON file inside zip
      downloadFileName = 'download.zip'  // Name for the downloaded file
    } = req.body;

    const zipResponse = await fetch(zipPath);
    
    if (!zipResponse.ok) {
      console.error('[ZIP API] Failed to fetch zip:', zipResponse.status);
      return res.status(zipResponse.status).json({ error: `Failed to fetch zip: ${zipResponse.status}` });
    }
    
    const arrayBuffer = await zipResponse.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);
    console.log('[ZIP API] Zip fetched from URL, size:', zipBuffer.length, 'bytes');

    // Load zip with JSZip
    const zip = await JSZip.loadAsync(zipBuffer);
    console.log('[ZIP API] Zip loaded, files:', Object.keys(zip.files));

    // Add JSON content to the zip
    const jsonString = typeof jsonContent === 'string' 
      ? jsonContent 
      : JSON.stringify(jsonContent, null, 2);
    
    zip.file(jsonFileName, jsonString);
    console.log('[ZIP API] Added JSON file:', jsonFileName);

    // Generate modified zip
    const modifiedZipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    console.log('[ZIP API] Modified zip generated, size:', modifiedZipBuffer.length, 'bytes');

    // Send the modified zip as download
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${downloadFileName}"`,
      'Content-Length': modifiedZipBuffer.length
    });

    res.send(modifiedZipBuffer);
    console.log('[ZIP API] Download sent successfully');

  } catch (error) {
    console.error('[ZIP API] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Middleware to ensure devsite paths are loaded
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next(); // Let API routes handle themselves
  }
  if (!isInitialized) {
    await fetchDevsitePaths();
    isInitialized = true;
  }
  next();
});

app.use(async (req, res) => {
  // if path prefix matches something in the devsitePaths
  // route request to the connector on port 3002
  // otherwise serve from aem-cli on port 3001
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const suffixSplit = req.url.split('/');
  let suffixSplitRest = suffixSplit.slice(1);

  let devsitePathMatch;
  let devsitePathMatchFlag = false;

  // find match based on level 3, 2, or 1 transclusion rule
  // if match found in higher level don't do lower level
  if (suffixSplit.length > 2) {
    devsitePathMatch = devsitePaths.find((element) => element.pathPrefix === `/${suffixSplit[1]}/${suffixSplit[2]}/${suffixSplit[3]}`);
    devsitePathMatchFlag = !!devsitePathMatch;
    if (devsitePathMatchFlag) {
      console.log('rest 3');
      suffixSplitRest = suffixSplit.slice(4);
    }
  }
  if (suffixSplit.length > 1 && !devsitePathMatchFlag) {
    devsitePathMatch = devsitePaths.find((element) => element.pathPrefix === `/${suffixSplit[1]}/${suffixSplit[2]}`);
    devsitePathMatchFlag = !!devsitePathMatch;
    if (devsitePathMatchFlag) {
      console.log('rest 2');
      suffixSplitRest = suffixSplit.slice(3);
    }
  }
  if (suffixSplit.length > 0 && !devsitePathMatchFlag) {
    devsitePathMatch = devsitePaths.find((element) => element.pathPrefix === `/${suffixSplit[1]}`);
    devsitePathMatchFlag = !!devsitePathMatch;
    if (devsitePathMatchFlag) {
      console.log('rest 1');
      suffixSplitRest = suffixSplit.slice(2);
    }
  }

  let upstreamUrl;
  let source;

  if (devsitePathMatchFlag && devsitePathMatch !== 'undefined') {
    source = 'docs';
    upstreamUrl = `http://127.0.0.1:3002${req.path}`;
  } else {
    source = 'aem';
    upstreamUrl = `http://127.0.0.1:3001${req.path}`;
  }

  console.log(`Fetching upstream url: ${upstreamUrl}`);

  // For font files, request uncompressed data to avoid decoding issues
  const fetchOptions = {};
  if (req.path.includes('.otf') || req.path.includes('.woff2') || req.path.includes('.ttf')) {
    fetchOptions.headers = {
      'Accept-Encoding': 'identity'
    };
  }

  const resp = await fetch(upstreamUrl, fetchOptions);
  let body;
  const contentType = resp.headers.get('content-type') || '';
  const isFont = contentType.includes('font') || contentType.includes('woff2') || contentType.includes('otf');

  // Handle headers differently for fonts vs other files
  const headers = new Map();
  if (isFont) {
    // For fonts, only copy essential headers and ensure no compression
    headers.set('content-type', contentType);
    headers.set('content-length', resp.headers.get('content-length') || '');
    // Explicitly remove any compression headers
    headers.delete('content-encoding');
  } else {
    // For non-fonts, copy all headers
    resp.headers.forEach((value, key) => headers.set(key, value));
  }

  if (source === 'docs' && contentType.includes('text/html')) {
    body = await resp.text();
    // inject the head.html
    const [pre, post] = body.split('</head>');
    body = `${pre}
    <link rel="stylesheet" href="/hlx_statics/styles/styles.css"/>
    <script src="/hlx_statics/scripts/scripts.js" type="module"></script>
    </head>
    ${post}`;
  } else {
    // Handle binary files (like fonts) properly
    if (isFont) {
      // For font files, preserve content-encoding and get binary data
      body = await resp.arrayBuffer();
    } else {
      // For text files, get as text and remove content-encoding if needed
      body = await resp.text();
      headers.delete('content-encoding');
    }
  }

  res.status(resp.status);

  // Set headers properly for Express
  headers.forEach((value, key) => {
    res.set(key, value);
  });

  if (isFont) {
    res.send(Buffer.from(body));
  } else {
    res.send(body);
  }

});

// Start server and initialize devsite paths
app.listen(PORT, async () => {
  console.debug(`Website dev server is running on port ${PORT}`);
  // Initialize devsite paths after server starts
  await fetchDevsitePaths();
  isInitialized = true;
});
