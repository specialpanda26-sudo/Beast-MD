#!/bin/bash
# 🔥 Henry Agent19v™ — One-Command Deploy
# Pushes to GitHub + triggers Render redeploy

RENDER_DEPLOY_HOOK="${RENDER_DEPLOY_HOOK:-}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║  🔥 Henry Agent19v™ — Auto Deploy 🔥    ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Git push
echo -e "${YELLOW}📦 Step 1: Pushing to GitHub...${NC}"
git add .
COMMIT_MSG="${1:-Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')}"
git commit -m "$COMMIT_MSG" 2>&1 | grep -v "^$"
PUSH=$(git push 2>&1)
echo "$PUSH"
if echo "$PUSH" | grep -q "error\|fatal\|rejected"; then
  echo -e "${RED}❌ Git push failed.${NC}"; exit 1
fi
echo -e "${GREEN}✅ GitHub push successful!${NC}\n"

# Step 2: Render redeploy
echo -e "${YELLOW}🚀 Step 2: Triggering Render redeploy...${NC}"
if [ -z "$RENDER_DEPLOY_HOOK" ]; then
  echo -e "${RED}⚠️  RENDER_DEPLOY_HOOK not set!${NC}"
  echo "Add it: echo \"export RENDER_DEPLOY_HOOK='your-url'\" >> ~/.bashrc && source ~/.bashrc"
  exit 0
fi
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$RENDER_DEPLOY_HOOK")
if [ "$HTTP" = "200" ] || [ "$HTTP" = "201" ]; then
  echo -e "${GREEN}✅ Render redeploy triggered!${NC}"
  echo -e "${CYAN}⏱️  Live in ~2-4 minutes. Check render.com/dashboard${NC}"
else
  echo -e "${RED}❌ Render trigger failed (HTTP $HTTP)${NC}"
fi
echo -e "\n${GREEN}🔥 Done!${NC}"
