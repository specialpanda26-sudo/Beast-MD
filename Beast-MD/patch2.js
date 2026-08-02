const fs = require("fs");
const path = "client_bridge.js";
let content = fs.readFileSync(path, "utf-8");

const oldBlock = "const apiClient = axios.create({\n  baseURL: BACKEND_URL,\n  // \u2705 FIX: was 45000ms. Any backend call accidentally left on the hot path\n  // (or any future one) could stall a reply for up to 45 seconds. 8s is\n  // generous for a localhost call and fails fast instead.\n  timeout: 8000,\n  maxContentLength: Infinity,\n  maxBodyLength: Infinity\n});";

const newBlock = "const apiClient = axios.create({\n  baseURL: BACKEND_URL,\n  timeout: 8000,\n  maxContentLength: Infinity,\n  maxBodyLength: Infinity,\n  headers: { Authorization: `Bearer ${process.env.ADMIN_PASSWORD || ''}` }\n});";

if (!content.includes(oldBlock)) {
  console.error("PATTERN NOT FOUND");
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(path, content, "utf-8");
console.log("PATCHED OK");
