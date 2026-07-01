'use strict';
// ── Keep-alive pinger ─────────────────────────────────────────────────────────
// Some free-tier hosts (Render, Koyeb) sleep the service after inactivity.
// This tiny script pings your own service URL every 4 minutes to keep it warm.
// Usage: node keepalive.js https://your-app.onrender.com
// Or add KEEPALIVE_URL to your .env and run it alongside index.js

const https  = require('https');
const http   = require('http');
const url    = process.argv[2] || process.env.KEEPALIVE_URL;
const INTERVAL = 4 * 60 * 1000; // 4 minutes

if (!url) {
  console.log('⚠️  No URL provided. Usage: node keepalive.js https://your-url.com');
  process.exit(0);
}

function ping() {
  const lib = url.startsWith('https') ? https : http;
  lib.get(url, (res) => {
    console.log(`[Keep-Alive] Pinged ${url} → ${res.statusCode}`);
  }).on('error', (e) => {
    console.error(`[Keep-Alive] Error: ${e.message}`);
  });
}

ping();
setInterval(ping, INTERVAL);
console.log(`🔄 Keep-alive active — pinging every 4 minutes`);
