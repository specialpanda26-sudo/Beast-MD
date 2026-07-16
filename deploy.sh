#!/bin/bash
# ╔══════════════════════════════════════════╗
# ║   MD Bot — Deploy Script        ║
# ║   Pushes to GitHub + Triggers Render    ║
# ╚══════════════════════════════════════════╝

# ── CONFIG — set these once ────────────────────────────────────────────────
# Your Render deploy hook URL (get it from: Render → your service → Settings → Deploy Hook)
RENDER_DEPLOY_HOOK="${RENDER_DEPLOY_HOOK:-}"

# ── COLORS ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║    MD Bot — Auto Deploy           ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── STEP 1: Git push ────────────────────────────────────────────────────────
echo -e "${YELLOW}📦 Step 1: Pushing to GitHub...${NC}"
git add .

# Use custom commit message if provided, else auto-generate
if [ -n "$1" ]; then
  COMMIT_MSG="$1"
else
  COMMIT_MSG="Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')"
fi

git commit -m "$COMMIT_MSG" 2>&1 | grep -v "^$"

PUSH_RESULT=$(git push 2>&1)
echo "$PUSH_RESULT"

if echo "$PUSH_RESULT" | grep -q "error\|fatal\|rejected"; then
  echo -e "${RED}❌ Git push failed. Fix the error above and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ GitHub push successful!${NC}\n"

# ── STEP 2: Trigger Render redeploy ─────────────────────────────────────────
echo -e "${YELLOW}🚀 Step 2: Triggering Render redeploy...${NC}"

if [ -z "$RENDER_DEPLOY_HOOK" ]; then
  echo -e "${RED}⚠️  RENDER_DEPLOY_HOOK not set!${NC}"
  echo ""
  echo "To get your deploy hook:"
  echo "  1. Go to render.com → your service"
  echo "  2. Click Settings"
  echo "  3. Scroll to 'Deploy Hook'"
  echo "  4. Copy the URL"
  echo ""
  echo "Then run this once to save it:"
  echo -e "${CYAN}  export RENDER_DEPLOY_HOOK='https://api.render.com/deploy/srv-XXXXX?key=YYYYYYY'${NC}"
  echo ""
  echo "Or add it permanently to ~/.bashrc:"
  echo -e "${CYAN}  echo \"export RENDER_DEPLOY_HOOK='your-url-here'\" >> ~/.bashrc${NC}"
  echo -e "${CYAN}  source ~/.bashrc${NC}"
  echo ""
  echo -e "${YELLOW}⚡ GitHub push is done — Render will auto-deploy from your push if auto-deploy is enabled.${NC}"
  exit 0
fi

# Trigger the deploy hook
DEPLOY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$RENDER_DEPLOY_HOOK")

if [ "$DEPLOY_RESPONSE" = "200" ] || [ "$DEPLOY_RESPONSE" = "201" ]; then
  echo -e "${GREEN}✅ Render redeploy triggered successfully!${NC}"
  echo ""
  echo -e "${CYAN}🌐 Check deploy status at: render.com/dashboard${NC}"
  echo -e "${CYAN}⏱️  Render usually takes 2–4 minutes to redeploy.${NC}"
else
  echo -e "${RED}❌ Render trigger failed (HTTP $DEPLOY_RESPONSE)${NC}"
  echo "Check your RENDER_DEPLOY_HOOK URL and try again."
fi

echo ""
echo -e "${GREEN}🔥 Done! Bot update is live!${NC}"
