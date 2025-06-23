require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Fuse = require("fuse.js");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  },
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan QR Code ini dengan WhatsApp");
});

client.on("ready", () => {
  console.log("Bot Active ✅");
});

function bacaDataJSON() {
  const filePath = path.join(__dirname, "./json/game.json");
  try {
    const jsonData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(jsonData);
  } catch (err) {
    console.error("Gagal baca file JSON:", err);
    return null;
  }
}

function cariGame(query, games) {
  const fuse = new Fuse(games, {
    keys: ["nama", "id"],
    threshold: 0.4,
  });

  const hasil = fuse.search(query);
  if (hasil.length > 0) return hasil[0].item;
  return null;
}

function addWatermark(text) {
  return `${text}\n\n> _*SixFussion*_ 🎮`;
}

function logChat(userMsg, response) {
  const now = new Date();
  const tanggal = now.toLocaleDateString("id-ID");
  const waktu = now.toLocaleTimeString("id-ID", { hour12: false });
  console.log(`[${tanggal} ${waktu}] Pesan: ${userMsg}`);
  console.log(
    `Balasan: ${response}\n\n=================================================================\n\n`
  );
}

async function getGeminiResponse(userInput) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const data = bacaDataJSON();

    const prompt = `
Kamu adalah asisten chatbot WhatsApp untuk layanan top-up game online bernama *SixFussion*.

Tugas utama:
- Menjawab pertanyaan tentang harga diamond/item game
- Menyampaikan info developer dan deskripsi game

Pedoman menjawab:
1. Bahasa sesuaikan dengan apa yang digunakan pelanggan jika pelanggan menggunakan bahasa inggris gunakan bahasa inggris begitupun jika menggunakan bahasa lainnya, singkat dan jelas
2. Jangan ulangi pertanyaan yang sudah disebut pelanggan
3. Kenali singkatan game populer:
   - ML = Mobile Legends
   - FF = Free Fire
   - PUBG = PlayerUnknown's Battlegrounds
   - GI = Genshin Impact
   - COD = Call of Duty
4. Jika pertanyaan "habisin X rupiah dapet berapa?", cari paket diamond terdekat
5. Gunakan sapaan pelanggan (kak, bang, bro)
6. Jangan tampilkan data jika tidak tersedia, cukup beri penjelasan
7. Jika pelanggan sudah menunjuk suatu item dan ingin langsung membelinya maka arahkan dia ke link berikut: http://localhost:8000/top-up/ganti tapi ganti yang paling belakang dengan id unik yang ingin di top-up kan user


Data game.json: ${JSON.stringify(data, null, 2)}

Pertanyaan user:
"${userInput}"
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error dari Gemini API:", error);
    return "❌ Maaf, saya tidak bisa menjawab sekarang.";
  }
}

client.on("message", async (message) => {
  const userMsg = message.body.toLowerCase();
  const chatId = message.from;
  const chat = await message.getChat();

  if (chat.isGroup) {
    const mentions = await message.getMentions();
    const botIsMentioned = mentions.some(
      (user) => user.id._serialized === client.info.wid._serialized
    );
    if (!botIsMentioned) return;
  }

  const data = bacaDataJSON();
  const games = data.game;

  if (userMsg.startsWith("// cari ")) {
    const query = userMsg.replace("// cari ", "").trim();
    const game = cariGame(query, games);
    const pesan = game
      ? `✨ Saya menemukan game *"${game.nama}"* dengan pencarian fuzzy untuk kata kunci "${query}".`
      : `⚠️ Maaf, tidak ada game cocok dengan kata kunci "${query}".`;
    logChat(userMsg, pesan);
    return client.sendMessage(chatId, addWatermark(pesan));
  }

  // liat data mentah
  if (userMsg === "data") {
    const prompt = `Berikut data JSON yang saya punya:\n${JSON.stringify(
      data,
      null,
      2
    )}\nTolong jelaskan data ini.`;
    const aiReply = await getGeminiResponse(prompt);
    logChat(userMsg, aiReply);
    return client.sendMessage(chatId, addWatermark(aiReply));
  }

  // ini response
  const aiReply = await getGeminiResponse(message.body);
  logChat(userMsg, aiReply);
  return client.sendMessage(chatId, addWatermark(aiReply));
});

client.initialize();
