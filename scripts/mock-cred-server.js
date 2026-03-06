#!/usr/bin/env node
/**
 * Mock lab credentials server for local testing.
 * Serves the lab email on http://localhost:8762 so lab-credentials.js can replace {adobeid}, {seat}, {lab}.
 *
 * Usage: node scripts/mock-cred-server.js [email]
 * Default email: L120-05@adobeeventlab.com
 */
const http = require('http');
const PORT = 8762;
const defaultEmail = 'L120-05@adobeeventlab.com';
const email = process.argv[2] || defaultEmail;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.end(email);
});

server.listen(PORT, () => {
  console.log(`Mock lab credentials server: http://localhost:${PORT} → "${email}"`);
  console.log('Keep this running, then preview a page with {adobeid} in the workbook.');
});
