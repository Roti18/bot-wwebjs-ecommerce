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

// === PROMPTING GEMINI DENGAN KONTEXT E-COMMERCE TOP UP GAME ===
async function getGeminiResponse(userInput) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const data = bacaDataJSON();

    const prompt = `
Kamu adalah asisten chatbot WhatsApp untuk layanan top-up game online bernama *SixFussion*.

Tugas kamu adalah:
- Menjawab pertanyaan tentang harga diamond atau item dari game tertentu
- Memberikan tutorial top-up
- Menyampaikan info developer game
- Menjelaskan deskripsi atau informasi umum tentang game

Pedoman dalam menjawab:
1. Gunakan bahasa Indonesia yang ramah, singkat, dan jelas.
2. Fokus hanya pada topik-topik seputar game dan top-up.
3. Jika pertanyaan tidak relevan, jawab dengan sopan dan arahkan agar pelanggan menyebut nama game.
4. Jangan menyebut pengguna sebagai "user". Sebut berdasarkan nama bio-nya, atau jika tidak tersedia, gunakan sapaan sesuai gaya dia menyapamu (misal: kak, bang, bro, dll).
5. Jika pelanggan menyapa, maka kamu bisa membalas seramah mungkin dan sehumble mungkin.
6. Jangan terlalu sering mengingatkan: "❗ Jangan lupa sebut nama gamenya yaa biar aku ngerti! 😎"
   Cukup beri arahan sopan jika benar-benar dibutuhkan.
7. Jika pelanggan mengajukan pertanyaan, dan ada pertanyaan lanjutan, jawablah dengan konteks yang berkaitan (konsisten dengan topik sebelumnya).
8. Saat menjawab pertanyaan tentang item, harga, atau informasi game lainnya, gunakan data berikut dari *game.json*. Tampilkan datanya secara rapi dan terstruktur, jangan berantakan:

${JSON.stringify(data, null, 2)}

- Menggunakan hanya satu bintang (*) di awal tiap bagian utama
- Menggunakan tanda hubung (-) untuk item dalam daftar
- Mengganti format bold/italic dengan _* untuk styling khusus pada nama brand
- Meletakkan emoji (💎, ✨, 📝) langsung setelah bintang tanpa spasi
- Menggunakan angka untuk langkah-langkah tutorial

rapikan formatnya seperti ini:
- Gunakan penomoran konsisten (angka atau bullet points)
- Buat indentasi yang sama untuk sub-item
- Kelompokkan berdasarkan kategori logis
- Gunakan spasi yang konsisten
- Tambahkan pemisah seperti garis atau spasi antar kategori


Pertanyaan dari user:
"${userInput}"
    `.trim();

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error dari Gemini API:", error);
    return "❌ Maaf, saya tidak bisa menjawab sekarang.";
  }
}

// === FUNGSI BACA DATA DAN KEYWORD JSON ===
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

// digantikan oleh ai
// function bacaKeywordJSON() {
//   const filePath = path.join(__dirname, "./json/keyword.json");
//   try {
//     const jsonData = fs.readFileSync(filePath, "utf-8");
//     return JSON.parse(jsonData);
//   } catch (err) {
//     console.error("Gagal baca keyword JSON:", err);
//     return null;
//   }
// }

function addWatermark(text) {
  return `${text}\n\n> _*SixFussion*_ 🎮`;
}

client.on("message", async (message) => {
  const userMsg = message.body.toLowerCase();
  const chatId = message.from;

  // cek kalo misal ga di tag ga bakal jawab (dalam)
  const chat = await message.getChat();
  if (chat.isGroup) {
    const mentions = await message.getMentions();
    const botIsMentioned = mentions.some(
      (user) => user.id._serialized === client.info.wid._serialized
    );
    if (!botIsMentioned) return;
  }

  const data = bacaDataJSON();
  // digantikan oleh ai
  // const keyData = bacaKeywordJSON();

  const games = data.game;
  // digantikan oleh ai
  // const greetings = keyData.sapa;
  // const keywordDev = keyData.keywordDev;

  const fuse = new Fuse(games, {
    keys: ["nama", "id"],
    threshold: 0.4,
  });

  function cariGame(query) {
    const hasil = fuse.search(query);
    if (hasil.length > 0) {
      return hasil[0].item;
    }
    return null;
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

  // digantikan oleh ai
  // if (greetings.includes(userMsg)) {
  //   const pesan = `*👋 Selamat datang di layanan top-up game _SixFussion_!*\n\nAku siap bantu kamu seputar dunia game 🎮🔥\n\nContoh pertanyaan yang bisa kamu coba:\n\n• _Harga diamond MLBB_\n• _Item FF_\n• _Tutorial top-up Genshin_\n• _Tentang PB_\n\n❗ *Jangan lupa sebut nama gamenya yaa biar aku ngerti!* 😎`;
  //   logChat(userMsg, pesan);
  //   return client.sendMessage(chatId, addWatermark(pesan));
  // }

  if (userMsg.startsWith("// cari ")) {
    const query = userMsg.replace("// cari ", "").trim();
    const foundGame = cariGame(query);

    if (foundGame) {
      const pesan = `✨ Saya menemukan game *"${foundGame.nama}"* dengan pencarian fuzzy untuk kata kunci "${query}".\nKetik nama game dengan benar agar saya bisa bantu lebih lanjut.`;
      logChat(userMsg, pesan);
      return client.sendMessage(chatId, addWatermark(pesan));
    } else {
      const pesan = `⚠️ Maaf, saya tidak menemukan game yang cocok dengan kata kunci "${query}".`;
      logChat(userMsg, pesan);
      return client.sendMessage(chatId, addWatermark(pesan));
    }
  }

  const foundGame = cariGame(userMsg);

  // digantikan oleh ai
  // if (keywordDev.some((k) => userMsg.includes(k))) {
  //   if (foundGame && foundGame.developer) {
  //     const pesan = `Pembuat atau Developer dari *${foundGame.nama}* adalah *${foundGame.developer}*.`;
  //     logChat(userMsg, pesan);
  //     return client.sendMessage(chatId, addWatermark(pesan));
  //   } else {
  //     const aiReply = await getGeminiResponse(message.body);
  //     logChat(userMsg, aiReply);
  //     return client.sendMessage(chatId, addWatermark(aiReply));
  //   }
  // }

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

  if (foundGame) {
    if (userMsg.includes("list item") || userMsg.includes("item")) {
      const items = foundGame.list_item.spesial_item
        .map(
          (item, idx) =>
            `${idx + 1}. *${item.nama_item}* = _Rp${item.harga.toLocaleString(
              "id-ID"
            )}_`
        )
        .join("\n");
      const pesan = `🛒 *Daftar Special Item ${foundGame.nama}:*\n\n${items}`;
      logChat(userMsg, pesan);
      return client.sendMessage(chatId, addWatermark(pesan));
    }

    if (userMsg.includes("diamond")) {
      const diamonds = foundGame.list_item.diamonds
        .map(
          (d, idx) =>
            `${idx + 1}. *${d.nama_item}* - _Rp${d.harga.toLocaleString(
              "id-ID"
            )}_`
        )
        .join("\n");
      const pesan = `💎 *Daftar Harga Item ${foundGame.nama}:*\n\n${diamonds}`;
      logChat(userMsg, pesan);
      return client.sendMessage(chatId, addWatermark(pesan));
    }

    if (
      userMsg.includes("tutor") ||
      userMsg.includes("tutorial") ||
      userMsg.includes("cara")
    ) {
      const tutor = foundGame.tutorial_topup
        .map((t, idx) => `${idx + 1}. ${t}`)
        .join("\n");
      const pesan = `📚 *Tutorial Top-up ${foundGame.nama}:*\n\n${tutor}`;
      logChat(userMsg, pesan);
      return client.sendMessage(chatId, addWatermark(pesan));
    }

    if (
      userMsg.includes("deskripsi") ||
      userMsg.includes("info") ||
      userMsg.includes("tentang")
    ) {
      const pesan = `📖 *Tentang ${foundGame.nama}:*\n\n_${foundGame.deskripsi}_`;
      logChat(userMsg, pesan);
      return client.sendMessage(chatId, addWatermark(pesan));
    }

    // digantikan oleh ai
    // const pesan = `✨ Saya menemukan game *"${foundGame.nama}"*. Kamu bisa ketik:\n\n• *list item ${foundGame.id}* → lihat special items\n• *diamond ${foundGame.id}* → daftar harga diamond\n• *tutorial Top Up ${foundGame.id}* → cara top-up\n• *deskripsi ${foundGame.id}* → info tentang game`;
    // logChat(userMsg, pesan);
    // return client.sendMessage(chatId, addWatermark(pesan));
  }

  const aiReply = await getGeminiResponse(message.body);
  logChat(userMsg, aiReply);
  return client.sendMessage(chatId, addWatermark(aiReply));
});

client.initialize();
