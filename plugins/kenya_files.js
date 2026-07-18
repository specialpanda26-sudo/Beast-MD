// ── kenya_files.js ────────────────────────────────────────────────────────
// Henry Ochibots — Kenya Documents & Files Tools
// The "Documents & Files" category — PDF tools, photo tools, QR/vCard/barcode.
// Uses libraries already proven working in this codebase:
//   • jimp        (see plugins/texteffects.js for the exact same API)
//   • qrcode      (see plugins/ported_tools.js .qrcode command)
//   • pdf-lib     (newly added — real PDF byte manipulation, no external API)
//   • tesseract.js (newly added — real local OCR for .ocr, eng+swa, no
//                    external API or per-use cost; downloads language
//                    data to disk on first use, then caches it)
//   • @imgly/background-removal-node (newly added — real local, free
//                    background removal for .nobg, no API key/cost;
//                    AGPL-licensed and needs a native ONNX runtime
//                    module, so it may not work on every host — .nobg
//                    fails gracefully with a message if it can't load)
//   • baileys downloadMediaMessage (see plugins/media.js .save/.vv commands)
//
// All commands operate on media the USER sends — reply to an image/PDF with
// the command. Nothing here calls a paid third-party API; everything runs
// locally so there's no per-use cost and no dependency on an external
// service being up.
// ─────────────────────────────────────────────────────────────────────────

const Jimp = require('jimp');
const QRCode = require('qrcode');
const { PDFDocument, degrees } = require('pdf-lib');
const { createWorker } = require('tesseract.js');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {};

// ── Shared helpers ────────────────────────────────────────────────────────

function reply(h, text) {
  return h.sock.sendMessage(h.from, { text }, { quoted: h.msg });
}

async function withTyping(h, fn) {
  try { await h.sock.sendPresenceUpdate('composing', h.from); } catch (_) {}
  try { return await fn(); }
  finally { try { await h.sock.sendPresenceUpdate('paused', h.from); } catch (_) {} }
}

// Extract whatever media the user is replying to (or attached directly),
// matching the exact working pattern from plugins/media.js (.save/.vv).
function getQuotedMediaMessage(h) {
  const ctx = h.msg.message?.extendedTextMessage?.contextInfo;
  const quotedMsg = ctx?.quotedMessage;
  const imageMsg = quotedMsg?.imageMessage || h.msg.message?.imageMessage;
  const docMsg = quotedMsg?.documentMessage || h.msg.message?.documentMessage;
  if (!imageMsg && !docMsg) return null;

  const dlMsg = quotedMsg
    ? { key: { remoteJid: h.from, id: ctx.stanzaId, participant: ctx.participant }, message: quotedMsg }
    : h.msg;

  return { dlMsg, kind: imageMsg ? 'image' : 'document', mimetype: (imageMsg || docMsg).mimetype };
}

async function downloadQuoted(h) {
  const found = getQuotedMediaMessage(h);
  if (!found) return null;
  const buffer = await downloadMediaMessage(found.dlMsg, 'buffer', {});
  return { buffer, ...found };
}

// Manual fallback guide for .ocr — used when there's no image attached,
// or when the Tesseract engine itself fails (e.g. can't init on this host).
function OCR_GUIDE_TEXT(prefix) {
  return (
`📱 *IMAGE-TO-TEXT (OCR) GUIDE*
━━━━━━━━━━━━━━━━━━━━━

${prefix}Reply to a photo with *.ocr* and I'll extract the text automatically. No photo attached this time — or you can use one of these manual options:

*Option 1 — Google Lens (easiest):*
1. Open Google Lens app (or Google Photos → the photo → Lens icon)
2. Point at or open the image
3. Tap "Select all" → "Copy text"
4. Paste anywhere

*Option 2 — Google Docs (free, on any phone):*
1. Upload the photo to Google Drive
2. Right-click → "Open with Google Docs"
3. Google automatically extracts the text into an editable document

*Option 3 — Microsoft Office Lens app:*
1. Install "Office Lens" (free)
2. Scan the document
3. Export as Word — text becomes editable

_Henry Ochibots 🇰🇪_`
  );
}

// ── MENU addition ─────────────────────────────────────────────────────────

Object.assign(module.exports, {

  "kefiles": async (h) => {
    await withTyping(h, () => reply(h,
`📂 *HENRY OCHIBOTS — DOCUMENTS & FILES*
_Real tools. No cyber needed._

━━━━━━━━━━━━━━━━━━━━━
🖼️ *PHOTO TOOLS*
━━━━━━━━━━━━━━━━━━━━━
.imgcompress — Reply to a photo to shrink its file size
.passport_photo — Reply to a photo → resize to official passport spec
.grayscale — Reply to a photo → convert to black & white
.nobg — Reply to a photo → remove background (free, runs locally)

━━━━━━━━━━━━━━━━━━━━━
📄 *PDF TOOLS*
━━━━━━━━━━━━━━━━━━━━━
.pdfinfo — Reply to a PDF → see page count & size
.pdfsplit <page number> — Reply to a PDF → extract one page
.pdfmerge — Reply to a PDF, then send a 2nd PDF within 60s to merge
.pdfrotate <degrees> — Reply to a PDF → rotate all pages

━━━━━━━━━━━━━━━━━━━━━
🔲 *CODES & CONTACTS*
━━━━━━━━━━━━━━━━━━━━━
.qr <text> — Generate a QR code from any text/link
.vcard <name> | <phone> | <email> — Generate scannable contact QR
.barcode <numbers> — Generate a barcode image

━━━━━━━━━━━━━━━━━━━━━
📱 *TEXT EXTRACTION*
━━━━━━━━━━━━━━━━━━━━━
.ocr — Reply to a photo of text → guide to extract it

━━━━━━━━━━━━━━━━━━━━━
⚖️ *LEGAL DOCUMENT TEMPLATES*
━━━━━━━━━━━━━━━━━━━━━
.affidavit <name> | <ID no> | <statement> — Draft affidavit
.demandletter <you> | <recipient> | <issue> | <amount/deadline> — Draft demand letter
.rentalagreement <landlord> | <tenant> | <address> | <rent> | <deposit> — Draft tenancy agreement

_Henry Ochibots 🇰🇪 — Tuko Pamoja_`
    ));
  },
  "files_menu": async (h) => module.exports["kefiles"](h),

});

// ── PHOTO TOOLS ───────────────────────────────────────────────────────────

Object.assign(module.exports, {

  // .imgcompress — reply to an image
  // NOTE: named .imgcompress, not .compress — .compress already exists in
  // ported_utility.js as RLE text compression, a completely different
  // feature. Using the same name would silently shadow it.
  "imgcompress": async (h) => {
    const media = await downloadQuoted(h);
    if (!media || media.kind !== 'image') {
      return reply(h, '❌ Reply to a *photo* with *.imgcompress* to shrink its file size.');
    }

    await withTyping(h, async () => {
      try {
        const originalSize = media.buffer.length;
        const image = await Jimp.read(media.buffer);

        // Resize if very large, then compress quality — mirrors what a
        // cyber operator does manually before uploading to eCitizen/KUCCPS.
        const MAX_DIMENSION = 1600;
        if (image.bitmap.width > MAX_DIMENSION || image.bitmap.height > MAX_DIMENSION) {
          image.scaleToFit(MAX_DIMENSION, MAX_DIMENSION);
        }
        image.quality(60);

        const outBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        const newSize = outBuffer.length;
        const savedPct = Math.max(0, Math.round((1 - newSize / originalSize) * 100));

        await h.sock.sendMessage(h.from,
          { image: outBuffer, caption:
`✅ *Image compressed!*

Original: ${(originalSize/1024).toFixed(0)} KB
Compressed: ${(newSize/1024).toFixed(0)} KB
Saved: ${savedPct}%

Ready to upload to eCitizen, KUCCPS, or any form that limits file size.
_Henry Ochibots 🇰🇪_` },
          { quoted: h.msg }
        );
      } catch (e) {
        await reply(h, `❌ Couldn't process that image: ${e.message}`);
      }
    });
  },

  // .passport_photo — reply to an image, crops/resizes to standard 35x45mm @ 300dpi ratio
  "passport_photo": async (h) => {
    const media = await downloadQuoted(h);
    if (!media || media.kind !== 'image') {
      return reply(h, '❌ Reply to a *clear face photo* with *.passport_photo* to resize it.');
    }

    await withTyping(h, async () => {
      try {
        const image = await Jimp.read(media.buffer);

        // Standard Kenya passport photo spec: 35mm x 45mm at 300dpi ≈ 413x531px
        const TARGET_W = 413, TARGET_H = 531;

        // Cover-crop to the target aspect ratio, centered — same effect a
        // photo studio produces, without needing to visit one.
        image.cover(TARGET_W, TARGET_H);
        image.quality(90);

        const outBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

        await h.sock.sendMessage(h.from,
          { image: outBuffer, caption:
`✅ *Passport-size photo ready!*

Size: 35mm x 45mm (413x531px @ 300dpi)
Matches standard Kenya passport/ID/visa spec.

📌 *Before using officially, double-check:*
• Background should be plain white/light
• Face should be centered, no shadows
• No smiling with teeth showing (for passport)
• No head covering (unless religious)

If background isn't plain, retake the photo against a white wall for best results.

_Henry Ochibots 🇰🇪_` },
          { quoted: h.msg }
        );
      } catch (e) {
        await reply(h, `❌ Couldn't process that image: ${e.message}`);
      }
    });
  },

  // .nobg — reply to an image. Free, local background removal (no API
  // key, no per-use cost) using an ONNX segmentation model that runs on
  // this server. Complements .removebg in ported_tools.js, which works
  // but needs a paid remove.bg API key (REMOVEBG_KEY) — this is the
  // free fallback when that's not configured, or the default choice.
  // NOTE: named .nobg, not .bgremove/.removebg/.rmbg — those already
  // exist in ported_tools.js pointing at the remove.bg API.
  "nobg": async (h) => {
    const media = await downloadQuoted(h);
    if (!media || media.kind !== 'image') {
      return reply(h, '❌ Reply to a *photo* with *.nobg* to remove its background.');
    }

    await withTyping(h, async () => {
      try {
        // Lazy-required: this package pulls in an ONNX runtime native
        // module. If it isn't installed, or fails to load on this
        // device's architecture (e.g. some Termux/Android setups), fail
        // gracefully instead of crashing plugin load for the whole bot.
        let removeBackground;
        try {
          ({ removeBackground } = require('@imgly/background-removal-node'));
        } catch (loadErr) {
          return reply(h,
`❌ Background removal isn't available on this server (couldn't load the engine: ${loadErr.message}).

If you have a remove.bg API key set up, try *.removebg* instead — that uses their hosted API rather than running locally.`
          );
        }

        await reply(h, '🔎 Removing background — this can take up to a minute on first run while the model downloads...');

        const blob = await removeBackground(media.buffer);
        const outBuffer = Buffer.from(await blob.arrayBuffer());

        await h.sock.sendMessage(h.from,
          { image: outBuffer, caption:
`✅ *Background removed!*

Free, no API key, ran locally on this server.

_Henry Ochibots 🇰🇪_` },
          { quoted: h.msg }
        );
      } catch (e) {
        await reply(h, `❌ Couldn't remove the background: ${e.message}\n\nIf you have a remove.bg API key configured, try *.removebg* as a fallback.`);
      }
    });
  },

  // NOTE: no .grayscale here — plugins/ported_tools.js already has a
  // working .grayscale/.gray/.grey command for images; adding a second
  // one here would silently override it (last-loaded plugin wins).

});

// ── PDF TOOLS ─────────────────────────────────────────────────────────────

Object.assign(module.exports, {

  // .pdfinfo — reply to a PDF
  "pdfinfo": async (h) => {
    const media = await downloadQuoted(h);
    if (!media || media.kind !== 'document') {
      return reply(h, '❌ Reply to a *PDF file* with *.pdfinfo* to see its details.');
    }

    await withTyping(h, async () => {
      try {
        const pdfDoc = await PDFDocument.load(media.buffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        const sizeKb = (media.buffer.length / 1024).toFixed(0);
        const firstPage = pdfDoc.getPage(0);
        const { width, height } = firstPage.getSize();

        await reply(h,
`📄 *PDF INFO*
━━━━━━━━━━━━━━━━━━━━━
Pages: *${pageCount}*
File size: *${sizeKb} KB*
Page size: ${Math.round(width)} x ${Math.round(height)} pt

Use *.pdfsplit <page number>* to extract a page.
Use *.pdfrotate <degrees>* to rotate all pages.

_Henry Ochibots 🇰🇪_`
        );
      } catch (e) {
        await reply(h, `❌ Couldn't read that PDF (it may be encrypted or corrupted): ${e.message}`);
      }
    });
  },

  // .pdfsplit <page number> — reply to a PDF
  "pdfsplit": async (h) => {
    const pageNum = parseInt(h.args[0], 10);
    const media = await downloadQuoted(h);
    if (!media || media.kind !== 'document') {
      return reply(h, '❌ Reply to a *PDF file* with *.pdfsplit <page number>*\nExample: .pdfsplit 2');
    }
    if (!pageNum || pageNum < 1) {
      return reply(h, '❌ Tell me which page number to extract.\nExample: .pdfsplit 2');
    }

    await withTyping(h, async () => {
      try {
        const srcDoc = await PDFDocument.load(media.buffer, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();

        if (pageNum > totalPages) {
          return reply(h, `❌ That PDF only has ${totalPages} page(s). You asked for page ${pageNum}.`);
        }

        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
        newDoc.addPage(copiedPage);
        const outBytes = await newDoc.save();

        await h.sock.sendMessage(h.from,
          { document: Buffer.from(outBytes), fileName: `page_${pageNum}.pdf`, mimetype: 'application/pdf' },
          { quoted: h.msg }
        );
        await reply(h, `✅ Extracted page ${pageNum} of ${totalPages}.\n_Henry Ochibots 🇰🇪_`);
      } catch (e) {
        await reply(h, `❌ Couldn't split that PDF: ${e.message}`);
      }
    });
  },

  // .pdfrotate <degrees> — reply to a PDF, rotates ALL pages
  "pdfrotate": async (h) => {
    const degreesArg = parseInt(h.args[0], 10);
    const media = await downloadQuoted(h);
    if (!media || media.kind !== 'document') {
      return reply(h, '❌ Reply to a *PDF file* with *.pdfrotate <degrees>*\nExample: .pdfrotate 90');
    }
    if (![90, 180, 270, -90, -180, -270].includes(degreesArg)) {
      return reply(h, '❌ Use 90, 180, or 270 degrees.\nExample: .pdfrotate 90');
    }

    await withTyping(h, async () => {
      try {
        const pdfDoc = await PDFDocument.load(media.buffer, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        pages.forEach(page => {
          const current = page.getRotation().angle;
          page.setRotation(degrees(current + degreesArg));
        });
        const outBytes = await pdfDoc.save();

        await h.sock.sendMessage(h.from,
          { document: Buffer.from(outBytes), fileName: `rotated.pdf`, mimetype: 'application/pdf' },
          { quoted: h.msg }
        );
        await reply(h, `✅ Rotated all pages by ${degreesArg}°.\n_Henry Ochibots 🇰🇪_`);
      } catch (e) {
        await reply(h, `❌ Couldn't rotate that PDF: ${e.message}`);
      }
    });
  },

  // .pdfmerge — reply to first PDF, bot waits for a second PDF within 60s
  "pdfmerge": async (h) => {
    const media = await downloadQuoted(h);
    if (!media || media.kind !== 'document') {
      return reply(h, '❌ Reply to the *first PDF* with *.pdfmerge*, then send the *second PDF* as your next message.');
    }

    await withTyping(h, () => reply(h,
      '📎 Got the first PDF. Now *send the second PDF* (as a document, not reply) within 60 seconds to merge them.'
    ));

    // Listen for the next document message from the same chat
    const timeoutMs = 60000;
    let resolved = false;

    await new Promise((resolve) => {
      const handler = async (m) => {
        if (resolved) return;
        const msgInfo = m.messages?.[0];
        if (!msgInfo || msgInfo.key.remoteJid !== h.from) return;
        const docMsg = msgInfo.message?.documentMessage;
        if (!docMsg || docMsg.mimetype !== 'application/pdf') return;

        resolved = true;
        h.sock.ev.off('messages.upsert', handler);
        clearTimeout(timer);

        try {
          const secondBuffer = await downloadMediaMessage(msgInfo, 'buffer', {});
          const doc1 = await PDFDocument.load(media.buffer, { ignoreEncryption: true });
          const doc2 = await PDFDocument.load(secondBuffer, { ignoreEncryption: true });

          const mergedDoc = await PDFDocument.create();
          const pages1 = await mergedDoc.copyPages(doc1, doc1.getPageIndices());
          pages1.forEach(p => mergedDoc.addPage(p));
          const pages2 = await mergedDoc.copyPages(doc2, doc2.getPageIndices());
          pages2.forEach(p => mergedDoc.addPage(p));

          const outBytes = await mergedDoc.save();
          await h.sock.sendMessage(h.from,
            { document: Buffer.from(outBytes), fileName: 'merged.pdf', mimetype: 'application/pdf' },
            { quoted: h.msg }
          );
          await reply(h, `✅ Merged! ${doc1.getPageCount()} + ${doc2.getPageCount()} = ${mergedDoc.getPageCount()} pages.\n_Henry Ochibots 🇰🇪_`);
        } catch (e) {
          await reply(h, `❌ Couldn't merge those PDFs: ${e.message}`);
        }
        resolve();
      };

      h.sock.ev.on('messages.upsert', handler);
      const timer = setTimeout(async () => {
        if (resolved) return;
        resolved = true;
        h.sock.ev.off('messages.upsert', handler);
        await reply(h, '⏱️ Timed out waiting for the second PDF. Run *.pdfmerge* again to retry.');
        resolve();
      }, timeoutMs);
    });
  },

});

// ── CODES & CONTACTS ──────────────────────────────────────────────────────

Object.assign(module.exports, {

  // NOTE: no .qr here — plugins/ported_tools.js already has a working
  // .qr/.qrcode command; adding a duplicate here would silently override
  // it since kenya_files.js loads after ported_tools.js.

  // .vcard <name> | <phone> | <email>
  "vcard": async (h) => {
    const text = h.args.join(' ');
    if (!text) return reply(h, '❌ Usage: *.vcard <name> | <phone> | <email>*\nExample: .vcard John Otieno | +254700000000 | john@email.com');

    await withTyping(h, async () => {
      try {
        const parts = text.split('|').map(s => s.trim());
        const name = parts[0] || 'Unknown';
        const phone = parts[1] || '';
        const email = parts[2] || '';

        const vcardText = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${name}`,
          phone ? `TEL;TYPE=CELL:${phone}` : '',
          email ? `EMAIL:${email}` : '',
          'END:VCARD'
        ].filter(Boolean).join('\n');

        const dataUrl = await QRCode.toDataURL(vcardText, { errorCorrectionLevel: 'M', scale: 8 });

        await h.sock.sendMessage(h.from,
          { image: { url: dataUrl }, caption:
`✅ *vCard QR Code ready!*

Name: ${name}
${phone ? 'Phone: ' + phone + '\n' : ''}${email ? 'Email: ' + email + '\n' : ''}
Anyone can scan this with their phone camera to instantly save your contact.

_Henry Ochibots 🇰🇪_` },
          { quoted: h.msg }
        );
      } catch (e) {
        await reply(h, `❌ Couldn't generate vCard: ${e.message}`);
      }
    });
  },

  // .barcode <numbers/text>
  "barcode": async (h) => {
    const text = h.args.join(' ');
    if (!text) return reply(h, '❌ Usage: *.barcode <numbers or text>*\nExample: .barcode 123456789012');

    await withTyping(h, async () => {
      try {
        // qrcode package only produces QR — for a true 1D barcode we render
        // a QR fallback but label it honestly rather than pretending it's
        // a real Code128/EAN barcode, since that library isn't installed.
        const dataUrl = await QRCode.toDataURL(text.slice(0, 500), { errorCorrectionLevel: 'M', scale: 8 });
        await h.sock.sendMessage(h.from,
          { image: { url: dataUrl }, caption:
`✅ Scannable code generated for: "${text}"

📌 Note: this is a QR code, not a 1D barcode (Code128/EAN). It scans fine with any phone camera or QR scanner app. If you specifically need a retail 1D barcode for a product, let me know and I'll point you to a dedicated barcode generator.

_Henry Ochibots 🇰🇪_` },
          { quoted: h.msg }
        );
      } catch (e) {
        await reply(h, `❌ Couldn't generate code: ${e.message}`);
      }
    });
  },

});

// ── TEXT EXTRACTION (OCR) ─────────────────────────────────────────────────

Object.assign(module.exports, {

  // .ocr — reply to a photo of text. Runs real OCR via Tesseract.js.
  // Falls back to the manual-app guide only if no image was attached or
  // OCR genuinely fails (e.g. worker/init error).
  "ocr": async (h) => {
    const media = await downloadQuoted(h);

    if (!media || media.kind !== 'image') {
      return withTyping(h, () => reply(h, OCR_GUIDE_TEXT('')));
    }

    await withTyping(h, async () => {
      let worker;
      try {
        await reply(h, '🔎 Reading text from your photo — this can take up to 30s...');

        worker = await createWorker(['eng', 'swa']);
        const { data: { text } } = await worker.recognize(media.buffer);
        const cleaned = (text || '').trim();

        if (!cleaned) {
          await reply(h,
`⚠️ Couldn't find any readable text in that photo.

Tips for better results: make sure the photo is well-lit, in focus, and the text is roughly horizontal and fills most of the frame. Then try *.ocr* again.

_Henry Ochibots 🇰🇪_`
          );
          return;
        }

        const LIMIT = 3500;
        const truncated = cleaned.length > LIMIT;
        const body = truncated ? cleaned.slice(0, LIMIT) + '…' : cleaned;

        await reply(h,
`📱 *TEXT EXTRACTED*
━━━━━━━━━━━━━━━━━━━━━
${body}
━━━━━━━━━━━━━━━━━━━━━${truncated ? '\n⚠️ Text was long and got cut off above.' : ''}
_Henry Ochibots 🇰🇪_`
        );
      } catch (e) {
        await reply(h, OCR_GUIDE_TEXT(`⚠️ OCR engine hit an error (${e.message}) — here's a manual fallback instead:\n\n`));
      } finally {
        if (worker) {
          try { await worker.terminate(); } catch (_) {}
        }
      }
    });
  },

});

// ── LEGAL DOCUMENT TEMPLATES ─────────────────────────────────────────────
// Fill-in-the-blank templates for common Kenyan legal/administrative
// documents. These are starting drafts, not legal advice — affidavits
// must still be sworn before a Commissioner for Oaths to be valid.

Object.assign(module.exports, {

  // .affidavit <full name> | <ID number> | <statement>
  "affidavit": async (h) => {
    const text = h.args.join(' ');
    if (!text) return reply(h, '❌ Usage: *.affidavit <full name> | <ID number> | <statement>*\nExample: .affidavit John Otieno | 12345678 | I lost my national ID card on 5th July 2026 in Nairobi CBD.');

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const name = parts[0] || '[Full Name]';
      const idNo = parts[1] || '[ID Number]';
      const statement = parts[2] || '[State the facts you are swearing to, in numbered points]';

      await reply(h,
`📜 *AFFIDAVIT — DRAFT*
━━━━━━━━━━━━━━━━━━━━━

REPUBLIC OF KENYA
IN THE MATTER OF: ${statement.split('.')[0] || '[Subject matter]'}

AFFIDAVIT

I, *${name}*, of ID Number *${idNo}*, of Postal Address ______________, do hereby make oath and state as follows:

1. THAT ${statement}
2. THAT the contents of this affidavit are true to the best of my knowledge, save where stated to be on information and belief, in which case I believe them to be true.

SWORN at Nairobi this ____ day of ____________, 20___

DEPONENT: _____________________

BEFORE ME:
COMMISSIONER FOR OATHS

━━━━━━━━━━━━━━━━━━━━━
⚠️ *This is a draft only.* To be legally valid it must be:
1. Printed and signed in person
2. Sworn before a *Commissioner for Oaths* (most advocates/law firms) or at a Kenya Law Courts registry
3. Fee: roughly *KES 100–500* for the commissioner's stamp (plus drafting fees if a lawyer prepares it for you)

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .demandletter <your name> | <recipient name> | <what's owed/issue> | <amount/deadline>
  "demandletter": async (h) => {
    const text = h.args.join(' ');
    if (!text) return reply(h, '❌ Usage: *.demandletter <your name> | <recipient name> | <issue> | <amount/deadline>*\nExample: .demandletter Jane Wanjiru | ABC Traders Ltd | unpaid invoice for goods supplied | KES 45,000 within 14 days');

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const sender = parts[0] || '[Your Name]';
      const recipient = parts[1] || '[Recipient Name]';
      const issue = parts[2] || '[Describe the debt/issue]';
      const demand = parts[3] || '[Amount owed and deadline]';

      await reply(h,
`📨 *DEMAND LETTER — DRAFT*
━━━━━━━━━━━━━━━━━━━━━

From: *${sender}*
To: *${recipient}*
Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}

Dear ${recipient},

*RE: DEMAND FOR ${issue.toUpperCase()}*

This letter serves as formal notice regarding ${issue}.

Despite previous attempts to resolve this matter amicably, the issue remains outstanding. I hereby demand ${demand}.

Should you fail to comply within the stated period, I will have no option but to pursue further legal action, including but not limited to filing a claim in the small claims court or engaging an advocate, without further reference to you. This may result in additional costs being borne by you.

I trust this matter will be resolved without the need for further action.

Yours faithfully,

*${sender}*
Signature: _____________________

━━━━━━━━━━━━━━━━━━━━━
📌 *Tips:*
• Send by registered post, email, or hand-delivery with acknowledgment — keep proof of delivery
• For amounts up to KES 1,000,000 you can file directly at the *Small Claims Court* without a lawyer
• Keep a copy for yourself

_Henry Ochibots 🇰🇪_`
      );
    });
  },

  // .rentalagreement <landlord> | <tenant> | <property address> | <rent amount> | <deposit>
  "rentalagreement": async (h) => {
    const text = h.args.join(' ');
    if (!text) return reply(h, '❌ Usage: *.rentalagreement <landlord> | <tenant> | <property address> | <monthly rent> | <deposit>*\nExample: .rentalagreement Peter Kamau | Mary Achieng | Plot 45, Kileleshwa, Nairobi | KES 25,000 | KES 25,000');

    await withTyping(h, async () => {
      const parts = text.split('|').map(s => s.trim());
      const landlord = parts[0] || '[Landlord Name]';
      const tenant = parts[1] || '[Tenant Name]';
      const address = parts[2] || '[Property Address]';
      const rent = parts[3] || '[Monthly Rent]';
      const deposit = parts[4] || '[Deposit Amount]';

      await reply(h,
`🏠 *RENTAL AGREEMENT — DRAFT*
━━━━━━━━━━━━━━━━━━━━━

TENANCY AGREEMENT

Made this ____ day of ____________, 20___ between:

*LANDLORD:* ${landlord} ("the Landlord")
*TENANT:* ${tenant} ("the Tenant")

*PROPERTY:* ${address}

1. *TERM:* This tenancy shall run on a month-to-month basis, commencing on ____________.
2. *RENT:* The Tenant shall pay rent of *${rent}* per month, payable in advance on or before the 5th day of each month.
3. *DEPOSIT:* The Tenant shall pay a refundable security deposit of *${deposit}*, refundable within 30 days of vacating, less any deductions for damage beyond normal wear and tear.
4. *NOTICE:* Either party may terminate this agreement by giving *one (1) calendar month's* written notice, per the Landlord and Tenant Act.
5. *USE:* The premises shall be used for residential purposes only.
6. *MAINTENANCE:* The Tenant shall keep the premises in good condition and report repairs promptly. Structural repairs remain the Landlord's responsibility.
7. *UTILITIES:* [Specify which party pays water, electricity, garbage collection, etc.]

SIGNED:

Landlord: _____________________  Date: ________

Tenant: _____________________  Date: ________

Witness: _____________________  ID No: ________

━━━━━━━━━━━━━━━━━━━━━
📌 *Note:* This is a simple draft covering the basics. For commercial leases, longer fixed terms, or high-value properties, have an advocate review it — stamp duty may also apply depending on the lease term.

_Henry Ochibots 🇰🇪_`
      );
    });
  },

});
