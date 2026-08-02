// ── kenya-web-routes.js ─────────────────────────────────────────────────────
// Exposes the SAME command logic from plugins/kenya_tools.js and
// plugins/kenya_files.js over plain HTTP, for people who can't afford to
// activate a paid bot session. No command logic is duplicated here — every
// request builds a mock WhatsApp-shaped `h` object, calls the real command
// function, and captures whatever it would have sent back as a WhatsApp
// message, then returns that as JSON.
//
// Mounted into client_bridge.js's existing internal pairServer (WEB_PORT,
// default 3000) via handleKenyaWebRequest(req, res, url), following the
// exact same pattern as pairServerRoutesExtra. Reachable publicly through
// app.py's /kenya-tools/* proxy (see app.py), the same way /pair already
// reaches the public Render URL despite running on an internal-only port.
//
// Nothing here needs a paired WhatsApp session or a paid activation — it's
// intentionally usable by anyone who can reach the URL.
// ─────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const kenyaTools = require('./plugins/kenya_tools.js');
const kenyaFiles = require('./plugins/kenya_files.js');

const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15MB — generous for a photo/PDF, not for abuse

// ── Manifest: one entry per command, built from the same usage text/menu
// copy that's already in the plugins (plugins/kenya_tools.js's `.ke` menu
// and plugins/kenya_files.js's `.kefiles` menu) so the web page never says
// anything different from what the bot itself says.
const MANIFEST = [
  { cat: '💰 Money Calculators', items: [
    { cmd: 'paye', desc: 'Net salary after tax', hint: '50000' },
    { cmd: 'nhif', desc: 'NHIF/SHA contribution', hint: '' },
    { cmd: 'nssf', desc: 'NSSF contribution', hint: '45000' },
    { cmd: 'loan', desc: 'Any loan repayment calculator', hint: '100000 13 12' },
    { cmd: 'helb', desc: 'HELB loan repayment', hint: '50000 13 12' },
    { cmd: 'mpesa_cost', desc: 'M-Pesa send cost', hint: '1500' },
    { cmd: 'vat', desc: 'VAT (16%) calculator', hint: '5000' },
    { cmd: 'stamp', desc: 'Stamp duty on property', hint: '5000000' },
    { cmd: 'token', desc: 'KPLC electricity tokens estimate', hint: '500' },
    { cmd: 'fuel', desc: 'Fuel cost', hint: '20 195' },
  ]},
  { cat: '🏛️ Govt Status Checks', items: [
    { cmd: 'voter', desc: 'IEBC voter + polling station', hint: '12345678' },
    { cmd: 'helb_status', desc: 'HELB loan status', hint: '12345678' },
    { cmd: 'kra', desc: 'KRA PIN/compliance guide', hint: 'A001234567T' },
    { cmd: 'ntsa', desc: 'NTSA vehicle check guide', hint: 'KDC 123A' },
    { cmd: 'nhif_status', desc: 'NHIF/SHA status guide', hint: '12345678' },
    { cmd: 'nssf_status', desc: 'NSSF statement guide', hint: '12345678' },
    { cmd: 'knec', desc: 'KNEC results guide', hint: '1234567890' },
    { cmd: 'kuccps', desc: 'KUCCPS placement guide', hint: '1234567890' },
  ]},
  { cat: '📄 Document Guides', items: [
    { cmd: 'id_replace', desc: 'Lost/replace National ID', hint: '' },
    { cmd: 'passport', desc: 'Passport application guide', hint: '' },
    { cmd: 'birth_cert', desc: 'Birth certificate guide', hint: '' },
    { cmd: 'good_conduct', desc: 'Police clearance guide', hint: '' },
    { cmd: 'business_reg', desc: 'Business registration', hint: '' },
    { cmd: 'kra_pin', desc: 'KRA PIN registration', hint: '' },
    { cmd: 'ecitizen', desc: 'eCitizen account setup', hint: '' },
  ]},
  { cat: '📝 Document Generators', items: [
    { cmd: 'cv', desc: 'Basic CV', hint: 'John Otieno software developer 3 years' },
    { cmd: 'cover', desc: 'Cover letter', hint: 'John Otieno Safaricom sales rep' },
    { cmd: 'invoice', desc: 'Invoice', hint: 'ABC Ltd 5 bags of cement KES 15000' },
    { cmd: 'payslip', desc: 'Payslip', hint: 'John Otieno 50000' },
    { cmd: 'resign', desc: 'Resignation letter', hint: 'John Otieno Safaricom 2026-08-01' },
  ]},
  { cat: '🎓 Education', items: [
    { cmd: 'kcse', desc: 'Mean grade calculator', hint: 'Math A English B Kiswahili B+' },
    { cmd: 'gpa', desc: 'GPA calculator (alias of kcse)', hint: 'Math A English B' },
    { cmd: 'bursary', desc: 'CDF bursary guide', hint: '' },
  ]},
  { cat: '🏥 Health & Emergency', items: [
    { cmd: 'emergency', desc: 'Emergency numbers by county', hint: '' },
    { cmd: 'hospitals', desc: 'Hospital finder guide', hint: '' },
    { cmd: 'blood', desc: 'Blood donation centers', hint: '' },
  ]},
  { cat: '🌾 Community', items: [
    { cmd: 'matatu', desc: 'Matatu fare guide', hint: 'CBD to Rongai' },
    { cmd: 'huduma', desc: 'Huduma Centre guide', hint: 'Nairobi' },
    { cmd: 'jobs', desc: 'Jobs board guide', hint: '' },
  ]},
  { cat: '⚖️ Legal Document Templates', items: [
    { cmd: 'affidavit', desc: 'Draft affidavit', hint: 'John Otieno | 12345678 | I lost my ID on 5th July 2026' },
    { cmd: 'demandletter', desc: 'Draft demand letter', hint: 'Jane | ABC Traders Ltd | unpaid invoice | KES 45,000 within 14 days' },
    { cmd: 'rentalagreement', desc: 'Draft tenancy agreement', hint: 'Peter Kamau | Mary Achieng | Kileleshwa Nairobi | KES 25,000 | KES 25,000' },
  ]},
  { cat: '🖼️ Photo Tools', items: [
    { cmd: 'imgcompress', desc: 'Shrink a photo\'s file size', needsFile: 'image' },
    { cmd: 'passport_photo', desc: 'Resize to official passport spec', needsFile: 'image' },
    { cmd: 'nobg', desc: 'Remove background (free, runs locally)', needsFile: 'image' },
    { cmd: 'ocr', desc: 'Extract text from a photo (Tesseract, eng+swa)', needsFile: 'image' },
  ]},
  { cat: '📄 PDF Tools', items: [
    { cmd: 'pdfinfo', desc: 'Page count & size', needsFile: 'pdf' },
    { cmd: 'pdfsplit', desc: 'Extract one page', needsFile: 'pdf', hint: '1' },
    { cmd: 'pdfrotate', desc: 'Rotate all pages', needsFile: 'pdf', hint: '90' },
    { cmd: 'pdfmerge', desc: 'Merge two PDFs into one', needsFile: 'pdf2' },
  ]},
  { cat: '🔲 Codes & Contacts', items: [
    { cmd: 'vcard', desc: 'Scannable contact QR', hint: 'John Otieno | 0712345678 | john@example.com' },
    { cmd: 'barcode', desc: 'Barcode image', hint: '123456789012' },
  ]},
];

// Commands that need a file upload, and how many.
const FILE_REQUIREMENTS = {};
MANIFEST.forEach(group => group.items.forEach(item => {
  if (item.needsFile) FILE_REQUIREMENTS[item.cmd] = item.needsFile;
}));

const ALL_COMMAND_NAMES = new Set(MANIFEST.flatMap(g => g.items.map(i => i.cmd)));

// ── raw body reader (binary-safe — readJsonBody in client_bridge.js
// concatenates as a string, which corrupts uploaded file bytes) ───────────
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (d) => {
      total += d.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('File too large (15MB limit)'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(d);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── minimal multipart/form-data parser — no new dependency, matches the
// hand-rolled style already used for JSON bodies elsewhere in this file.
// Handles the standard browser FormData shape: text fields + file fields.
function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = {};

  let start = buffer.indexOf(boundaryBuf, 0);
  while (start !== -1) {
    const next = buffer.indexOf(boundaryBuf, start + boundaryBuf.length);
    if (next === -1) break;
    let part = buffer.slice(start + boundaryBuf.length, next);
    start = next;

    if (part.slice(0, 2).toString() === '\r\n') part = part.slice(2);
    const sep = part.indexOf('\r\n\r\n');
    if (sep === -1) continue;
    const headerText = part.slice(0, sep).toString('utf8');
    let body = part.slice(sep + 4);
    if (body.slice(-2).toString() === '\r\n') body = body.slice(0, -2);

    const nameMatch = headerText.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const filenameMatch = headerText.match(/filename="([^"]*)"/);
    const ctypeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

    if (filenameMatch && filenameMatch[1]) {
      files[nameMatch[1]] = {
        buffer: body,
        filename: filenameMatch[1],
        mimetype: ctypeMatch ? ctypeMatch[1].trim() : 'application/octet-stream',
      };
    } else {
      fields[nameMatch[1]] = body.toString('utf8');
    }
  }
  return { fields, files };
}

// ── mock WhatsApp handler context — the whole point of this file. Every
// real command in kenya_tools.js/kenya_files.js only ever touches
// h.sock.sendMessage / h.sock.sendPresenceUpdate / h.from / h.msg / h.args
// / h.webBuffer, so a plain object satisfying that shape is enough to run
// the exact same code path WhatsApp uses.
function buildMockH(args, file) {
  const messages = [];
  const sock = {
    sendMessage: async (jid, content) => {
      if (content.text) {
        messages.push({ type: 'text', text: content.text });
      } else if (content.image) {
        const buf = Buffer.isBuffer(content.image) ? content.image : content.image.url;
        messages.push({ type: 'image', buffer: buf, caption: content.caption || '' });
      } else if (content.document) {
        messages.push({
          type: 'document',
          buffer: content.document,
          fileName: content.fileName || 'file',
          mimetype: content.mimetype || 'application/octet-stream',
        });
      }
      return { key: {} };
    },
    sendPresenceUpdate: async () => {},
    ev: { on: () => {}, off: () => {} }, // pdfmerge's WhatsApp event flow is bypassed entirely on web — see run()
  };
  const h = { sock, from: 'web-user', msg: { key: {}, message: {} }, args: args || [] };
  if (file) {
    h.webBuffer = file.buffer;
    h.webKind = (file.mimetype || '').startsWith('image/') ? 'image' : 'document';
    h.webMimetype = file.mimetype;
  }
  return { h, messages };
}

function bufToDataUrl(buffer, mimetype) {
  return `data:${mimetype || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
}

async function runCommand({ command, argsText, file, file2 }) {
  if (!ALL_COMMAND_NAMES.has(command)) {
    const err = new Error(`Unknown command "${command}"`);
    err.statusCode = 404;
    throw err;
  }

  const fileReq = FILE_REQUIREMENTS[command];
  if (fileReq === 'pdf2') {
    if (!file || !file2) {
      const err = new Error('This tool needs two PDF files.');
      err.statusCode = 400;
      throw err;
    }
    const { outBytes, pages1, pages2, pagesTotal } = await kenyaFiles.mergePdfBuffers(file.buffer, file2.buffer);
    return [
      { type: 'document', dataUrl: bufToDataUrl(Buffer.from(outBytes), 'application/pdf'), fileName: 'merged.pdf' },
      { type: 'text', text: `✅ Merged! ${pages1} + ${pages2} = ${pagesTotal} pages.` },
    ];
  }
  if (fileReq && !file) {
    const err = new Error(`This tool needs a ${fileReq === 'image' ? 'photo' : 'PDF'} upload.`);
    err.statusCode = 400;
    throw err;
  }

  const args = (argsText || '').trim() ? (argsText || '').trim().split(/\s+/) : [];
  // For | -separated commands (affidavit/demandletter/rentalagreement/vcard)
  // the frontend sends the whole "A | B | C" string as one field — args must
  // reconstitute to that exact string when joined with spaces, so split on
  // whitespace is wrong for those. Simplest fix: pass the raw text as a
  // single-element array when the raw text contains "|", matching how
  // h.args.join(' ') is used downstream in every one of these commands.
  const finalArgs = (argsText || '').includes('|') ? [(argsText || '').trim()] : args;

  const { h, messages } = buildMockH(finalArgs, file);
  const fn = kenyaTools[command] || kenyaFiles[command];
  if (typeof fn !== 'function') {
    const err = new Error(`Command "${command}" has no handler`);
    err.statusCode = 500;
    throw err;
  }

  await fn(h);

  return messages.map(m => {
    if (m.type === 'text') return { type: 'text', text: m.text };
    if (m.type === 'image') return { type: 'image', dataUrl: bufToDataUrl(m.buffer, 'image/png'), caption: m.caption };
    if (m.type === 'document') return { type: 'document', dataUrl: bufToDataUrl(m.buffer, m.mimetype), fileName: m.fileName };
    return null;
  }).filter(Boolean);
}

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function handleKenyaWebRequest(req, res, url) {
  if (!url.pathname.startsWith('/kenya-tools')) return false;

  // GET /kenya-tools or /kenya-tools/ — serve the frontend
  if (req.method === 'GET' && (url.pathname === '/kenya-tools' || url.pathname === '/kenya-tools/')) {
    const htmlPath = path.join(__dirname, 'kenya-tools-web.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(htmlPath, 'utf8'));
    } else {
      res.writeHead(404); res.end('kenya-tools-web.html not found');
    }
    return true;
  }

  // GET /kenya-tools/manifest — tool catalogue for the frontend to render
  if (req.method === 'GET' && url.pathname === '/kenya-tools/manifest') {
    sendJson(res, 200, { categories: MANIFEST });
    return true;
  }

  // POST /kenya-tools/run — execute a command, return captured output
  if (req.method === 'POST' && url.pathname === '/kenya-tools/run') {
    try {
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
      const raw = await readRawBody(req);

      let fields = {};
      let files = {};
      if (boundaryMatch) {
        const boundary = boundaryMatch[1] || boundaryMatch[2];
        ({ fields, files } = parseMultipart(raw, boundary));
      } else {
        // no file — plain form-urlencoded or JSON fallback
        try {
          fields = JSON.parse(raw.toString('utf8') || '{}');
        } catch (_) {
          fields = Object.fromEntries(new URLSearchParams(raw.toString('utf8')));
        }
      }

      const result = await runCommand({
        command: fields.command,
        argsText: fields.args,
        file: files.file,
        file2: files.file2,
      });
      sendJson(res, 200, { ok: true, messages: result });
    } catch (e) {
      sendJson(res, e.statusCode || 500, { ok: false, error: e.message });
    }
    return true;
  }

  return false;
}

module.exports = { handleKenyaWebRequest };
