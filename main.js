const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
  authStrategy: new LocalAuth(),
});
// auth
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan QR di terminal");
});
client.on("ready", () => {
  console.log("WhatsApp bot siap!");
});
client.on("authenticated", (session) => {
  console.log("Authenticated!");
});
client.on("auth_failure", (msg) => {
  console.error("Auth gagal:", msg);
});
client.on("disconnected", (reason) => {
  console.log("Terputus:", reason);
});

// message
client.on("message_create", (message) => {
  if (message.body === ".ping") {
    client.sendMessage(message.from, "pong");
  }
});

client.initialize();
