#!/usr/bin/env python3
"""
Generates assets/BeastBot-Whats-Fixed.pdf — the plain-language "what was
broken / what was fixed / what it means for you" report, one entry per
CHANGES.md update. Re-run after adding a new entry to CHANGES.md:

    python3 scripts/generate-whats-fixed-pdf.py

UPDATES below is the single source of truth for this PDF's content — add
a new dict to the list for each new update rather than editing PDF layout
code directly.
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'assets', 'BeastBot-Whats-Fixed.pdf')

styles = getSampleStyleSheet()
title_style = ParagraphStyle('TitleX', parent=styles['Title'], fontSize=17, spaceAfter=2)
subtitle_style = ParagraphStyle('SubtitleX', parent=styles['Normal'], fontSize=12.5, textColor=colors.HexColor('#128C7E'), spaceAfter=10)
intro_style = ParagraphStyle('IntroX', parent=styles['Normal'], fontSize=9.3, textColor=colors.HexColor('#444444'), spaceAfter=10, leading=13)
toc_h_style = ParagraphStyle('TocH', parent=styles['Heading2'], fontSize=13, spaceBefore=6, spaceAfter=8)
toc_item_style = ParagraphStyle('TocItem', parent=styles['Normal'], fontSize=9.3, leading=14)
update_h_style = ParagraphStyle('UpdateH', parent=styles['Heading2'], fontSize=12, spaceBefore=14, spaceAfter=5, textColor=colors.HexColor('#075E54'))
label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9.3, spaceBefore=4, spaceAfter=2, textColor=colors.HexColor('#128C7E'), fontName='Helvetica-Bold')
body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=9.3, leading=13, spaceAfter=4)
footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8.5, textColor=colors.HexColor('#888888'))

# ── Content: one dict per update. `n` = number shown, `title`, then the
# three plain-language sections. This is the same content as the prior
# version of the PDF, kept verbatim, plus two new entries (19, 20).
UPDATES = [
    dict(n=1, title="Sub-admin activation",
         broken="Only the primary owner could approve new customer sessions or extend a customer's subscription — sub-admins had no way to help manage the bot.",
         fixed="Any bot admin (owner, co-owner, or sub-admin) can now approve pairing requests and extend subscriptions. The system also remembers which admin \u201cowns\u201d which customer.",
         means="If you have trusted helpers running the bot with you, they can now approve and manage their own customers without needing you every time."),
    dict(n=2, title="Extended commands",
         broken="The bot was missing a range of useful features: AI content tools, group-activity insight, polls, moderation helpers, and media extras.",
         fixed="About 30 new commands were added covering those categories, backed by proper storage so the data persists.",
         means="More things the bot can do out of the box — see the Commands section of the User Guide."),
    dict(n=3, title="Correctly merged into main",
         broken="A previous update package was built from an outdated copy of the bot and would have quietly deleted features that already existed (like the wallet purchase route).",
         fixed="The update was rebuilt from the real, current version of the bot, so nothing was lost.",
         means="No visible change for you — this was a behind-the-scenes safety fix to avoid losing features."),
    dict(n=4, title="Bot name recognition in groups",
         broken="In groups, the bot only replied when @mentioned or replied to directly — calling it by name (\u201cochibots, can you help\u201d) did nothing.",
         fixed="The bot now also responds when called by name, matched carefully so it doesn't misfire on unrelated words like \u201crobot\u201d or \u201cchatbot\u201d.",
         means="You can talk to the bot more naturally in group chats, just by saying its name."),
    dict(n=5, title="Community chat, owner auto-reply, media search, antiban toggle",
         broken="There was no shared community space; the owner's own WhatsApp number had no personalized auto-reply; song/video search required an exact link; and an anti-ban on/off switch existed in the database but was never actually checked by the bot.",
         fixed="Added a public/DM community chat page; a Sheng-style personal auto-reply scoped only to the owner's own number; search-by-name for songs and videos; and the anti-ban toggle now actually turns protection on or off as expected.",
         means="More ways to reach the bot and its owner, easier media downloads, and a safety toggle that finally does what it says."),
    dict(n=6, title="Recovery features audited",
         broken="The deleted-message and view-once recovery features hadn't been checked for edge cases.",
         fixed="Reviewed end to end; found and fixed one real bug affecting restricted groups.",
         means="Message/media recovery is more reliable, especially in groups with tighter permissions."),
    dict(n=7, title="Real antiban bug: self-forwards flagged as risky",
         broken="When the bot forwarded a message to itself (for recovery features), the anti-ban system counted it as a risky outgoing message — it wasn't.",
         fixed="Self-forwards are now correctly excluded from risk scoring.",
         means="Fewer false alarms on your anti-ban health stats, and a lower chance of your number being throttled for something that was never actually risky."),
    dict(n=8, title="Connection watchdog + admin UI audit",
         broken="If a session's connection silently died without a clean disconnect event, nothing noticed or tried to recover it.",
         fixed="Added a watchdog that detects a silently-dead connection and forces a reconnect. Also audited the admin panel for matching gaps.",
         means="Sessions are more likely to self-heal instead of sitting dead until someone notices."),
    dict(n=9, title="Reports & Group Bans admin tabs",
         broken="Two admin features (viewing reports, viewing group bans) had working backend logic but no screen in the admin panel to actually see them.",
         fixed="Matching tabs were added to the admin panel UI.",
         means="You can now see reported issues and group ban history directly from the panel, not just in the database."),
    dict(n=10, title="\u200b.dl/YouTube resilience, silent-logout notice, browser label",
         broken="YouTube downloads were unreliable due to bot-detection; if a session got logged out silently, nobody was told; and the bot's browser identity string was generic.",
         fixed="Hardened the download path against bot detection, added a notification when a session logs out unexpectedly, and gave the bot a cleaner browser label.",
         means="Downloads are more reliable, and you'll actually find out if a linked number gets logged out, instead of it just going quiet."),
    dict(n=11, title="Recovery labels dropped, new .claude command",
         broken="Some cosmetic labels on recovery messages were cluttered, and there was no direct way to ask Claude (Anthropic's AI) a question from inside WhatsApp.",
         fixed="Cleaned up the labels, and added a .claude command that sends your question to Claude and replies in chat (needs an Anthropic API key configured by the bot owner).",
         means="Cleaner recovery messages, plus a direct line to a second, more capable AI when you need it."),
    dict(n=12, title=".antibanstats display bug fixed",
         broken="The .antibanstats status screen always showed \u201cNotify-only mode: ON\u201d, even when an admin had actually switched it to the stricter mode.",
         fixed="Fixed the check so it reflects the real, current setting instead of always reading as on.",
         means="What .antibanstats tells you about your safety settings is now actually accurate."),
    dict(n=13, title=".tts audio bug and yt-dlp's new requirement",
         broken="Text-to-speech voice notes sometimes arrived as broken, unplayable files, and YouTube downloads suddenly started failing bot-wide with a cryptic runtime error.",
         fixed="Text-to-speech now checks that it actually got real audio back before sending it (instead of blindly forwarding a broken response), and a small JavaScript runtime (Deno) was added so yt-dlp can solve YouTube's new anti-bot challenge.",
         means="Voice notes and YouTube downloads work reliably again."),
    dict(n=14, title="Delta feature pack + Henry v20 commands merged",
         broken="Two large command packs (games, group-guard, notes, sports scores, URL tools, and 236 more ported commands from a friend's bot) existed as separate files not yet wired into the bot.",
         fixed="Both packs were merged in, every name checked for collisions against existing commands (13 real collisions found and resolved in favor of the already-working version), and a new .commands command was added to search the complete, always-current list.",
         means="Roughly 370 more commands are available."),
    dict(n=15, title="Build fix + full command-registry audit",
         broken="A dependency version conflict could make deployment fail outright on Render. Separately, several \u201csmart menu\u201d and command-search features (.smenu, .find, .perf, and others) always reported empty results because the internal command registry was never actually populated from the real command list.",
         fixed="Fixed the dependency conflict for deployment, and wired the registry to build itself automatically from the real, live command list at startup.",
         means="Deployments succeed reliably, and the smart-menu/search/stats commands now show real, accurate data instead of always coming back empty."),
    dict(n=16, title="Dead rentbot subsystem removed, branding fixed",
         broken="A half-built \u201crent out a cloned bot\u201d feature existed in the command list but silently failed every time (it imported a file that was never written) — and the bot's own status displays showed inconsistent naming/branding.",
         fixed="Removed the non-functional rentbot commands rather than leave broken entries in the menu, and standardized the bot's displayed name/branding everywhere.",
         means="No more dead commands that error out no matter what you type; consistent branding across the menu, panel, and status messages."),
    dict(n=17, title="Settings toggles wired up + automatic welcome/goodbye",
         broken="About 16 .set settings (auto-read, auto-react, bot name, PM permission, and more) saved successfully and said \u201cenabled\u201d — but nothing in the bot ever actually checked those saved values, so toggling them did nothing. Separately, group goodbye messages had a working command and storage, but nothing ever triggered them when someone actually left a group, and there was no equivalent feature at all for welcoming new members.",
         fixed="Every one of those settings is now actually read and acted on live, with no restart needed. Two new protections were added on top: PM Permit (approve first-time DMs before anything else runs) and Auto Block (blocks repeat unapproved DMers). The bot now also listens for the actual WhatsApp join/leave event, and a new .welcomecfg command lets you set a custom welcome message the same way .goodbye already worked for leaves.",
         means="Every settings toggle you flip in chat or the admin panel now genuinely changes the bot's behavior. New members get an automatic welcome message and departing members get an automatic goodbye — both fully customizable — with no manual triggering needed."),
    dict(n=18, title="Full correctness pass, documentation, and this report",
         broken="The command menu, README, and internal changelog hadn't had a full consistency check in a while — including a numbering mix-up in the technical changelog, and there was no plain-language summary of any of this for a non-technical reader.",
         fixed="Verified the .menu, .commands, and .smenu commands all stay accurate automatically and checked every file for missing dependencies and syntax errors (all clean). Fixed the changelog numbering so every update has one unique number, in order. Updated the README with the missing commands and a summary of recent fixes. Wrote this PDF.",
         means="The documentation you're reading now — README, CHANGES.md, and this report — accurately reflects what the bot actually does, and this report gives you a plain-English way to catch up on everything without reading source code."),
    dict(n=19, title="Merged two divergent zips back into one",
         broken="Two copies of the project had drifted apart from the same base, each with real work the other was missing — including 38+ owner-only commands that had no permission check at all, meaning any user could run them.",
         fixed="Merged both copies with nothing dropped from either side. Every one of those missing permission checks was added back. .getfile was hardened against reading .env/credential files and against path traversal outside the project folder. Several code-runner commands were switched from raw shell execution to a safer method that can't be hijacked with special characters. A fake \u201cforwarded via newsletter\u201d tag that was silently added to every bot reply was removed. A full branding sweep replaced remaining leftover third-party names.",
         means="The bot is meaningfully safer than before this merge — commands that should have been restricted now actually are, and a few real security holes are closed."),
    dict(n=20, title="Production hardening: secrets, PayPal, more security fixes, phone-friendly cookie uploads, one-message full menu",
         broken="Several third-party API keys were hardcoded directly in the bot's source code instead of kept private. The AI chatbot had no defense against someone tricking it into revealing its setup or secrets. Two admin commands (.getfile and .inspect) had real bugs — one was completely broken and threw an error every time it ran, the other could be tricked into reading the bot's private .env file (which holds every password and API key) and posting it into the chat. There was no way to pay via PayPal. Setting up YouTube downloads required desktop/server access Henry doesn't have on his phone. The full command list (.menu all) arrived as 3-4 separate messages instead of one.",
         fixed="All hardcoded keys moved to private configuration. The AI chatbot now refuses to reveal secrets, configuration, or its own instructions, even under trick prompts. Both admin command bugs fixed — .getfile works again, and .inspect can no longer read anything outside the plugins folder. PayPal support added: a .paypal command for the payment link, .paypalfunds for wallet top-ups (admin-reviewed, same as M-Pesa), and a \u201cBuy Me a Coffee\u201d button on the website. A new .setcookies command lets the owner upload YouTube login cookies by simply sending the file on WhatsApp — no computer needed. The full command menu was rebuilt to always fit in exactly one message, however large the command list grows.",
         means="Your data and the bot owner's credentials are meaningfully safer. Customers now have a second, PayPal-based way to pay. YouTube downloads can be kept working entirely from a phone. And .menu all now shows everything in one message instead of several."),
]

story = []
story.append(Paragraph('Henry Ochibots v19™', title_style))
story.append(Paragraph('What Was Fixed — Plain-Language Report', subtitle_style))
story.append(Paragraph(
    "This document explains, in plain language, what was broken in the bot, what was fixed, and what "
    "that means for you day to day. It covers every update made to the codebase so far, in the order "
    "they happened. For the full technical write-up (file names, function names, exact code changes), "
    "see CHANGES.md in the project files. This PDF is the human-readable version.", intro_style
))
story.append(PageBreak())

story.append(Paragraph('Table of Contents', toc_h_style))
for u in UPDATES:
    story.append(Paragraph(f"{u['n']}. {u['title']}", toc_item_style))
story.append(PageBreak())

for i, u in enumerate(UPDATES):
    story.append(Paragraph(f"Update {u['n']} — {u['title']}", update_h_style))
    story.append(Paragraph('■ What was broken', label_style))
    story.append(Paragraph(u['broken'], body_style))
    story.append(Paragraph('■ What was fixed', label_style))
    story.append(Paragraph(u['fixed'], body_style))
    story.append(Paragraph('■ What it means for you', label_style))
    story.append(Paragraph(u['means'], body_style))

story.append(Spacer(1, 14))
story.append(Paragraph(
    "Looking for how to use the bot day to day instead of what changed under the hood? See "
    "BeastBot-User-Guide.pdf — both are available for download from the pairing page and are sent "
    "automatically when you message the bot with \u201cpair\u201d.", footer_style
))

doc = SimpleDocTemplate(
    OUT_PATH, pagesize=letter,
    topMargin=0.6 * inch, bottomMargin=0.6 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    title="Beast Bot - What Was Fixed", author='Henry Ochibots'
)
doc.build(story)
print(f"✅ Wrote {OUT_PATH}")
