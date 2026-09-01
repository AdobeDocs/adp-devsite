# Adobe I/O Website Helix Repository
This is the Adobe I/O Helix repo. It contains all the scripts, styles and other helixy bits to power the adobe.io website. 

## Installation
You need Node 24.
1. `$ npm install`
2. Start the dev server, picking one of the two options below.

### Option A: `$ npm run dev`
Use this if you also need doc-path requests proxied to a local content
connector (running separately, outside this repo, on ports 3002/3003).

This runs the AEM CLI dev server (port 3001) and a local markup/proxy server
(`dev.mjs`, port 3000) concurrently. 

Navigate to http://localhost:3000/

The proxy server serves the site and forwards doc-path requests to the
connector, falling back to the AEM CLI dev server otherwise.

### Option B: `$ npm run dev:aem`
Use this if you don't need the local content connector (you're only
working on blocks and want to use stage content).

This runs only the AEM CLI dev server. Navigate to http://localhost:3001/.
