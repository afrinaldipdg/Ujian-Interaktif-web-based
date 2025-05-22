# 🧠 Online Exam App Web-based

Selamat datang di repositori **Online Exam App Web-based**, sebuah aplikasi ujian online berbasis web yang sederhana namun fungsional. Proyek ini dibuat sebagai percobaan kecil untuk mengimplementasikan penyajian soal acak berbasis JSON dengan tampilan responsif dan navigasi ujian yang jelas.

🌐 **Coba aplikasinya di sini**: [https://crocus-scientific-toque.glitch.me/](https://crocus-scientific-toque.glitch.me/)

---

## 📂 Struktur Proyek
```
├── exam.html # Halaman informasi ujian
├── exam-question-ai.json # Kumpulan soal ujian dalam format JSON
├── index.html # Landing page utama
├── log.html # Halaman log aktivitas ujian
├── log.txt # File log text (opsional)
├── package.json # Metadata proyek dan dependensi npm
├── package-lock.json # Kunci versi dependensi
├── server.js # Server backend Node.js
├── shrinkwrap.yaml # File pengunci dependensi tambahan
└── test.html # Lembar soal ujian (tampilan utama ujian)

```
---


---

## 🚀 Fitur Utama

- ✅ Menampilkan soal secara acak dari JSON
- ✅ Tampilan responsif & ringan
- ✅ Server ringan berbasis Node.js
- ✅ Logging sesi ujian (eksperimental)
- ✅ Bisa di-deploy di Glitch, Vercel, atau layanan serupa

---

## 🛠️ Cara Menjalankan Lokal

```bash
# Clone repository
git clone https://github.com/afrinaldipdg/Ujian-Interaktif-web-based.git
cd nama-repo

# Instal dependensi
npm install

# Jalankan server
node server.js
```

Lalu buka di browser:
http://localhost:3000

📘 File Soal (exam-question-ai.json)
```json
[
  {
    "id": "1",
    "question": "Apa itu Natural Language Processing?",
    "options": ["Ilmu tentang pemrosesan citra", "Teknologi bahasa manusia", "Bahasa pemrograman", "Basis data"],
    "answer": "Teknologi bahasa manusia"
  }
]
```


📸 Tampilan Antarmuka

| Halaman      | Deskripsi                        |
| ------------ | -------------------------------- |
| `index.html` | Landing page dengan tombol mulai |
| `exam.html`  | Informasi sebelum ujian dimulai  |
| `test.html`  | Halaman soal dengan navigasi     |
| `log.html`   | Halaman catatan ujian (opsional) |


📄 Lisensi
Proyek ini menggunakan lisensi MIT. Bebas digunakan, dimodifikasi, dan dikembangkan untuk keperluan edukatif maupun eksperimen pribadi.

🙏 Kontribusi & Kredit
Proyek ini merupakan hasil eksperimen pribadi yang dikembangkan untuk pembelajaran dan eksplorasi ide.

Dibuat dengan ❤️ oleh [Afrinaldi](https://github.com/afrinaldipdg)

Terima kasih telah mengunjungi repositori ini! 🚀
