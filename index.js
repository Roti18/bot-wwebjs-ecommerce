require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Fuse = require("fuse.js");

// Set 'true' agar bot merespons semua pesan di grup.
// Set 'false' agar bot hanya merespons jika di-tag/@mentioned di grup.
const public = false;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY tidak ditemukan di file .env");
  process.exit(1);
}
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
  console.log("Pindai Kode QR ini dengan WhatsApp Anda");
});

client.on("ready", () => {
  console.log("Bot Aktif ✅");
});

function bacaDataJSON() {
  const filePath = path.join(__dirname, "./json/game.json");
  try {
    const jsonData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(jsonData);
  } catch (err) {
    console.error("Gagal membaca file JSON:", err);
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
  // ganti ini (jika tidak perlu hapus saja)
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
Anda adalah asisten chatbot WhatsApp untuk layanan top-up game online bernama *SixFussion*.

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


1. Gunakan bahasa yang sesuai dengan pelanggan. Jika pelanggan menggunakan bahasa Inggris, gunakan bahasa Inggris, begitu pula sebaliknya. Jawaban harus singkat dan jelas.
2. Jangan ulangi pertanyaan yang sudah diajukan pelanggan.
3. Kenali singkatan game populer: ML (Mobile Legends), FF (Free Fire), PUBG, GI (Genshin Impact), COD (Call of Duty).
4. Jika ditanya "habisin X rupiah dapat berapa?", carikan paket diamond terdekat dengan nominal tersebut.
5. Gunakan sapaan akrab seperti "kak", "bang", atau "bro".
6. Jika data tidak tersedia, cukup berikan penjelasan, jangan tampilkan data kosong.
7. Jika pelanggan ingin membeli item tertentu, arahkan ke link berikut: https://6fussion.up.railway.app/top-up/ID_GAME, ganti "ID_GAME" dengan id unik game yang dimaksud.

Data game dari game.json: ${JSON.stringify(data, null, 2)}

Pertanyaan user:
"${userInput}"
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error dari Gemini API:", error);
    return "❌ Maaf, terjadi kesalahan. Saya tidak bisa memberikan balasan saat ini.";
  }
}

async function handleMessage(message) {
  const userMsg = message.body.toLowerCase();
  const chatId = message.from;

  const data = bacaDataJSON();
  if (!data || !data.game) {
    const errorMsg = "⚠️ Maaf, data game sedang tidak tersedia.";
    logChat(userMsg, errorMsg);
    return client.sendMessage(chatId, addWatermark(errorMsg));
  }

  const aiReply = await getGeminiResponse(message.body);
  logChat(userMsg, aiReply);
  return client.sendMessage(chatId, addWatermark(aiReply));
}

client.on("message", async (message) => {
  const chat = await message.getChat();

  if (chat.isGroup && !public) {
    const mentions = await message.getMentions();
    const botIsMentioned = mentions.some(
      (contact) => contact.id._serialized === client.info.wid._serialized
    );
    if (!botIsMentioned) {
      return;
    }
  }

  handleMessage(message);
});

client.initialize();
