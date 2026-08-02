const fs = require("fs");
const path = "client_bridge.js";
let content = fs.readFileSync(path, "utf-8");

const oldBlock = "              if (result.type === \"code\") {\n                await socket.sendMessage(sender, {\n                  text: `🔑 *Your Pairing Code:* ${result.value}\\n\\n📱 *Steps:*\\n1. Open WhatsApp\\n2. Go to Linked Devices\\n3. Tap *Link a Device*\\n4. Tap *Link with phone number instead*\\n5. Enter the code above\\n\\n⏱️ This code expires quickly — enter it right away.`\n                }, { quoted: msg });\n              } else {";

const newBlock = "              if (result.type === \"code\") {\n                await socket.sendMessage(sender, {\n                  text: result.value\n                }, { quoted: msg });\n                await socket.sendMessage(sender, {\n                  text: `🔑 That's your pairing code — copy it now.\\n\\n📱 *Steps:*\\n1. Open WhatsApp\\n2. Go to Linked Devices\\n3. Tap *Link a Device*\\n4. Tap *Link with phone number instead*\\n5. Paste/enter the code from the message above\\n\\n⏱️ This code expires quickly — enter it right away.`\n                });\n              } else {";

if (!content.includes(oldBlock)) {
  console.error("PATTERN NOT FOUND");
  process.exit(1);
}

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(path, content, "utf-8");
console.log("PATCHED OK");
