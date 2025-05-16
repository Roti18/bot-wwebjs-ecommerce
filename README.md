# 🤖 SixFussion WhatsApp Bot

Bot WhatsApp cerdas yang membantu pelanggan dalam layanan top-up game seperti Mobile Legends, Free Fire, dan lainnya.  
Dibangun dengan [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) dan [Gemini API](https://ai.google.dev/).

---

## 🛠️ Fitur Utama
- Cek harga diamond atau item dalam game 💎  
- Panduan/tutorial top-up otomatis 📚  
- Info developer dan deskripsi game 📝  
- Smart reply menggunakan AI Gemini  
- Pencarian nama game dengan fuzzy search  
- Interaksi responsif dan ramah

---

## 📦 Dependencies

Pastikan kamu sudah menginstal Node.js.  
Instal semua dependency dengan:
```bash
npm install
```

Library yang digunakan:
- whatsapp-web.js – integrasi dengan WhatsApp Web
- dotenv – untuk menyimpan API Key di file .env
- fs, path – untuk membaca file JSON lokal
- qrcode-terminal – menampilkan QR login WhatsApp di terminal
- @google/generative-ai – koneksi ke Gemini AI
- fuse.js – pencarian fuzzy nama game

## 📁 Struktur Folder
```
.
├── index.js               // File utama bot
├── .env                   // Menyimpan API Key
├── /json
│   └── game.json          // Data game dan harga/item
```

## 🔐 Konfigurasi .env
Buka file `.env` di root proyek dan isi:
```
GEMINI_API_KEY=ISI_DENGAN_KUNCI_API_KAMU
```

## 🚀 Menjalankan Bot
1. Install dependencies:
```bash
npm install
```
2. Jalankan bot:
```bash
node index.js
```
3. Scan QR code yang muncul di terminal dengan WhatsApp kamu

## 📊 Format Pertanyaan yang Didukung
Contoh pertanyaan yang bisa kamu kirim ke bot:
- harga diamond mlbb
- item ff
- tutorial top-up genshin
- tentang PUBG
- game by Moonton

## 📌 Catatan
- Bot akan merespon otomatis hanya jika disebut di grup
- Semua data diambil dari file JSON (bisa diupdate manual)
- Jika pertanyaan tidak dikenal, Gemini AI akan mencoba menjawab

## 📄 Lisensi
MIT License © 2025 SixFussion Developer Team
