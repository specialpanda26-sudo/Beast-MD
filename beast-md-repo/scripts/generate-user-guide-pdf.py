#!/usr/bin/env python3
"""
Generates assets/HalloweenMD-User-Guide.pdf — the customer-facing "how to use
the bot day to day" guide. Re-run this after any change to public-facing
commands/wallet/pairing flow so the PDF stays accurate:

    python3 scripts/generate-user-guide-pdf.py

Content lives inline below as plain data so it's easy to edit without
touching PDF/reportlab plumbing.
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem
)

OUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'assets', 'HalloweenMD-User-Guide.pdf')

styles = getSampleStyleSheet()
title_style = ParagraphStyle('TitleX', parent=styles['Title'], fontSize=18, spaceAfter=2)
subtitle_style = ParagraphStyle('SubtitleX', parent=styles['Normal'], fontSize=13, textColor=colors.HexColor('#128C7E'), spaceAfter=10)
intro_style = ParagraphStyle('IntroX', parent=styles['Normal'], fontSize=9.5, textColor=colors.HexColor('#444444'), spaceAfter=14, leading=13)
h_style = ParagraphStyle('H', parent=styles['Heading2'], fontSize=12.5, spaceBefore=14, spaceAfter=6, textColor=colors.HexColor('#075E54'))
body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=9.5, leading=13)
bullet_style = ParagraphStyle('Bullet', parent=body_style, leftIndent=14)
footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8.5, textColor=colors.HexColor('#888888'))

cmd_col1 = ParagraphStyle('CmdCol', parent=body_style, fontName='Courier', fontSize=8.7)
cmd_col2 = ParagraphStyle('DescCol', parent=body_style, fontSize=8.7)

def cmd_table(rows):
    data = [[Paragraph(c, cmd_col1), Paragraph(d, cmd_col2)] for c, d in rows]
    t = Table(data, colWidths=[1.7 * inch, 4.6 * inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, 0), (-1, -1), 0.3, colors.HexColor('#EEEEEE')),
    ]))
    return t

def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(i, bullet_style), leftIndent=14, bulletIndent=0) for i in items],
        bulletType='bullet', start='•'
    )

story = []
story.append(Paragraph('HALLOWEEN MD™', title_style))
story.append(Paragraph('Halloween MD — User Guide', subtitle_style))
story.append(Paragraph(
    "This guide is for people using Halloween MD (Halloween MD) day to day — customers and group "
    "members, not the bot owner. It covers linking your number, everyday commands, your wallet and "
    "access, and where to get help.", intro_style
))

story.append(Paragraph('1. Linking Your WhatsApp Number', h_style))
story.append(Paragraph('You can link your own number to run a bot session in two ways:', body_style))
story.append(bullets([
    "<b>Web:</b> Open the bot's website and go to the Pair page. Choose Pair Code or QR Code, enter your "
    "number (no + sign, e.g. 254712345678), and follow the on-screen steps.",
    "<b>In WhatsApp chat:</b> Message the bot's number with <font face='Courier'>.pair</font>. It will ask "
    "you to reply 1 for QR Code or 2 for Pairing Code, then walk you through linking right there in the chat.",
]))
story.append(Paragraph(
    "Once linked, open WhatsApp → Menu (⋮) → Linked Devices → Link a Device → \"Link with phone number "
    "instead\", and enter the code you were given.", body_style
))

story.append(Paragraph('2. Activating Your Session', h_style))
story.append(Paragraph('A freshly linked session starts locked. To unlock it:', body_style))
story.append(bullets([
    "Send <font face='Courier'>.pair key</font> to request access — this notifies the admin.",
    "Once approved, you'll receive a one-time activation key (valid 10 minutes).",
    "Send it back as <font face='Courier'>.key XXXXXX</font> to unlock your session.",
]))
story.append(Paragraph(
    "<b>Tip:</b> save the bot's number to your contacts — this helps avoid your number getting flagged or "
    "banned by WhatsApp.", body_style
))

story.append(Paragraph('3. Everyday Commands (Public)', h_style))
story.append(Paragraph('Available to everyone once your session is active:', body_style))
story.append(cmd_table([
    ('.menu', 'Show the full command menu — one message, every command'),
    ('.ping', "Check the bot's response speed"),
    ('.runtime', 'See uptime and system info'),
    ('.weather [city]', 'Live weather for a city'),
    ('.dict [word]', 'Dictionary definition'),
    ('.convert [amt] [from] [to]', 'Currency converter, e.g. .convert 100 USD KES'),
    ('.roll [sides]', 'Roll a dice'),
    ('.myperm', 'Check your permission level'),
    ('.register', 'Get your web panel link (free credits + trust badge)'),
    ('.profile', 'View your wallet balance & badge'),
    ('.addfunds [amt] [code]', 'Top up your wallet via M-Pesa (admin reviews it)'),
    ('.paypal', 'Show the PayPal.me support/payment link'),
    ('.paypalfunds [amt] [txn_id]', 'Top up your wallet via PayPal (admin reviews it)'),
    ('.referral', 'Get your referral link and track earnings'),
    ('.pricing', 'See current prices/config'),
    ('.imagine [desc]', 'AI image generation — free, no API key needed'),
    ('.tts [text]', 'Convert text to a spoken voice note'),
    ('.model [name]', 'Switch AI model: llama / llama8 / mixtral / gemma'),
    ('.checklink [url]', 'Check whether a link looks safe or suspicious'),
    ('.pair', 'Link your OWN number as a new bot session, right in chat'),
]))

story.append(Paragraph('4. Games', h_style))
story.append(cmd_table([
    ('.hangman', 'Start hangman (reply with letters)'),
    ('.trivia', 'Random trivia question'),
    ('.guess [max]', 'Number guessing game (default 1–100)'),
    ('.truth', 'Truth or Dare — Truth'),
    ('.dare', 'Truth or Dare — Dare'),
    ('.wyr', 'Would You Rather'),
]))

story.append(Paragraph('5. Lookup Tools', h_style))
story.append(cmd_table([
    ('.validate [num]', "Check a phone number's format/region"),
    ('.ipinfo [ip]', 'Public geo/ASN info for an IP address'),
    ('.whois [domain]', 'Public WHOIS/RDAP data for a domain'),
]))

story.append(Paragraph('6. Media Commands', h_style))
story.append(cmd_table([
    ('.sticker', 'Turn an image or short video into a sticker'),
    ('.getpp [@user]', 'Get a profile picture, even from an unsaved/private number'),
    ('.about [@user]', "Get someone's About status text (works unsaved)"),
    ('.share', 'Reply to a message to forward it to that number'),
    ('.download [url]', 'Download a video (YouTube/TikTok)'),
    ('.song [url]', 'Extract MP3 audio from a link'),
    ('.dl [url]', 'Universal downloader — YT/TikTok/IG/FB/X/SoundCloud'),
    ('.convertmedia [fmt]', 'Convert media format — reply to an image/video/audio'),
]))

story.append(Paragraph('7. AI Chat', h_style))
story.append(Paragraph(
    "Just message the bot directly — no command needed. It replies in Swahili, Sheng, or English depending "
    "on how you write to it. Use <font face='Courier'>/ask [query]</font> to ask it anything directly.",
    body_style
))

story.append(Paragraph('8. Your Wallet & Access', h_style))
story.append(Paragraph(
    "Every user has a kesh wallet shown via <font face='Courier'>.profile</font>. Top it up two ways: "
    "<font face='Courier'>.addfunds [amount] [code]</font> after paying via M-Pesa, or "
    "<font face='Courier'>.paypalfunds [amount] [txn_id]</font> after paying via the link from "
    "<font face='Courier'>.paypal</font> — either way, the admin reviews and confirms top-ups before the "
    "kesh lands in your wallet. You can also earn wallet credit by inviting people with your "
    "<font face='Courier'>.referral</font> link.",
    body_style
))
story.append(Paragraph(
    "Open your Bot Panel (get the link via <font face='Courier'>.register</font>) to see your session's "
    "live ban-risk health and buy extra subscription days directly from your wallet — no admin approval "
    "needed for that part. Forgot your panel password? Open the panel and tap \"Forgot password?\" — a "
    "reset code is sent to you on WhatsApp.", body_style
))

story.append(Paragraph('9. Login / Logout', h_style))
story.append(cmd_table([
    ('.login [user] [pass]', 'Unlock full access with your panel credentials'),
    ('.logout', 'Remove your access from this chat'),
]))

story.append(Paragraph('10. Safety & Good Practice', h_style))
story.append(bullets([
    "Never share your pairing code, activation key, or panel password with anyone.",
    "Use <font face='Courier'>.checklink</font> before opening a suspicious link someone sends you.",
    "Save the bot's number to your contacts to reduce the chance of it getting flagged.",
    "If your session shows unusual behaviour, use the Bot Panel to check its ban-risk health.",
]))

story.append(Paragraph('11. Getting Help', h_style))
story.append(Paragraph(
    "For anything not covered here, send <font face='Courier'>.menu</font> in your chat with the bot at "
    "any time to see the live, up-to-date command list for your account and role — it's now sent as a "
    "single message, not split into several.", body_style
))

story.append(Spacer(1, 16))
story.append(Paragraph('Halloween MD™ — Multimedia WhatsApp Bot — created by @henrytech254', footer_style))

doc = SimpleDocTemplate(
    OUT_PATH, pagesize=letter,
    topMargin=0.6 * inch, bottomMargin=0.6 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch,
    title='Halloween MD User Guide', author='Halloween MD'
)
doc.build(story)
print(f"✅ Wrote {OUT_PATH}")
