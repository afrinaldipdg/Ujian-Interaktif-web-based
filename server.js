const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

// Middleware untuk parsing body (data form)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware untuk logging setiap request
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Menerima permintaan: ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);
    next();
});

// Middleware untuk menulis log ke file log.txt
const logStream = require('fs').createWriteStream('log.txt', { flags: 'a' });
app.use((req, res, next) => {
    const body = req.method === 'POST' ? JSON.stringify(req.body) : '';
    const logLine = `${new Date().toISOString()} - ${req.method} ${req.url}${body ? ` - BODY: ${body}` : ''}\n`;
    logStream.write(logLine);
    next();
});

// Serving static files (HTML, CSS, JS) from the root directory
// If you want to use a 'public' folder, uncomment the line below and create the folder:
// app.use(express.static(path.join(__dirname, 'public')));

// Since we are not using a 'public' folder for simplicity in this example,
// we define routes for each HTML file explicitly.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/exam.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'exam.html'));
});

app.get('/test.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

app.get('/log.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'log.html'));
});


// Objek untuk menyimpan data ujian yang sedang berlangsung dan timeout
// app.locals digunakan agar data tetap ada selama aplikasi berjalan (server side memory)
app.locals.exams = {};
app.locals.examTimeouts = {};

/**
 * Memuat soal-soal ujian dari file JSON dan mengacak urutannya.
 * @returns {Promise<Array>} Array of question objects.
 */
async function loadQuestions() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'exam-question-ai.json'), 'utf8');
        let questions = JSON.parse(data);
        // Mengacak urutan soal
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        return questions;
    } catch (error) {
        console.error("Gagal memuat soal ujian:", error);
        return []; // Kembalikan array kosong jika gagal
    }
}

/**
 * Route untuk memulai ujian.
 * Menerima nama, alamat, dan durasi dari form (index.html).
 * Mengirim soal ujian yang sudah diacak ke klien.
 */
app.post('/start-exam', async (req, res) => {
    const { nama, alamat, durasi } = req.body; // durasi dalam menit
    const examDurationMs = parseInt(durasi, 10) * 60 * 1000;

    if (!nama || !alamat || isNaN(examDurationMs) || examDurationMs <= 0) {
        return res.status(400).json({ error: "Data tidak lengkap atau durasi tidak valid." });
    }

    const questions = await loadQuestions();
    if (questions.length === 0) {
        return res.status(500).json({ error: "Soal ujian tidak tersedia." });
    }

    // Ambil sejumlah soal yang diinginkan, misal 10 soal
    // Anda bisa mengubah angka 10 ini sesuai kebutuhan
    const numberOfQuestions = Math.min(10, questions.length);
    const selectedQuestions = questions.slice(0, numberOfQuestions);

    const examId = `exam-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();
    const endTime = startTime + examDurationMs;

    app.locals.exams[examId] = {
        nama,
        alamat,
        questions: selectedQuestions, // Simpan soal yang dipilih untuk ujian ini
        startTime,
        endTime,
        status: "in-progress",
        answers: {}, // Untuk menyimpan jawaban pengguna
        nilai: 0,
        jumlahBenar: 0,
        jumlahSalah: 0,
        lulus: false,
        waktuPengerjaan: 0 // Waktu pengerjaan aktual dalam menit
    };

    // Set timeout untuk mengakhiri ujian jika tidak disubmit secara manual
    app.locals.examTimeouts[examId] = setTimeout(() => {
        if (app.locals.exams[examId] && app.locals.exams[examId].status === "in-progress") {
            console.log(`Ujian ${examId} habis waktu.`);
            const exam = app.locals.exams[examId];
            const waktuPengerjaanHabis = Math.floor((exam.endTime - exam.startTime) / 60000); // Durasi penuh ujian
            calculateExamResults(examId, exam, exam.answers, waktuPengerjaanHabis); // Hitung hasil dengan jawaban yang ada
            // Optionally, you could send a silent notification to the user or log it
        }
    }, examDurationMs + 5000); // Beri sedikit kelonggaran waktu (5 detik)

    // Redirect ke exam.html dengan examId sebagai query parameter
    res.redirect(`/exam.html?examId=${examId}`);
});

/**
 * Route untuk mendapatkan detail soal ujian (tanpa jawaban benar) berdasarkan ID ujian.
 * Digunakan oleh test.html untuk menampilkan soal.
 */
app.get('/get-exam/:examId', (req, res) => {
    const examId = req.params.examId;
    const exam = app.locals.exams[examId];

    if (!exam || exam.status !== "in-progress") {
        return res.status(404).json({ error: "Ujian tidak ditemukan atau sudah selesai." });
    }

    // Kirim hanya data yang diperlukan ke frontend (tanpa jawaban yang benar)
    const questionsForClient = exam.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options
    }));

    res.json({
        nama: exam.nama,
        alamat: exam.alamat,
        questions: questionsForClient,
        startTime: exam.startTime,
        endTime: exam.endTime
    });
});

/**
 * Fungsi untuk menghitung hasil ujian.
 * Dipisahkan agar bisa dipanggil dari submit-exam dan timeout.
 */
function calculateExamResults(examId, exam, userAnswers, waktuPengerjaan) {
    let jumlahBenar = 0;
    let jumlahSalah = 0;

    exam.questions.forEach((q, index) => {
        // Asumsi nama input radio di frontend adalah `question-${index}`
        const userAnswerKey = `question-${index}`;
        const userAnswer = userAnswers[userAnswerKey]; // Ini adalah string opsi yang dipilih (misal: "A. Azure Translator")

        // Temukan jawaban yang benar dari opsi yang diberikan
        // `q.answer` di JSON adalah 'A', 'B', 'C', 'D'
        // `q.options` adalah array string (misal: ["A. Opt1", "B. Opt2"])
        // Kita perlu mencari nilai opsi yang dimulai dengan huruf jawaban yang benar dari q.answer
        const correctAnswerPrefix = q.answer + '.'; // Contoh: "A."
        const correctOptionFullString = q.options.find(opt => opt.startsWith(correctAnswerPrefix));

        // Debugging logs - uncomment for detailed analysis
        // console.log(`Soal ${index + 1}:`);
        // console.log(`  Soal: ${q.question}`);
        // console.log(`  Jawaban Pengguna (full): ${userAnswer}`);
        // console.log(`  Jawaban Benar (prefix): ${q.answer}`);
        // console.log(`  Opsi Benar (full string): ${correctOptionFullString}`);


        if (userAnswer && userAnswer === correctOptionFullString) {
            jumlahBenar++;
        } else {
            jumlahSalah++;
        }
    });

    const totalQuestions = exam.questions.length;
    const nilai = totalQuestions > 0 ? (jumlahBenar / totalQuestions) * 100 : 0;
    const lulus = nilai >= 70; // Atur batas kelulusan di sini (misal: 70)

    exam.nilai = parseFloat(nilai.toFixed(2)); // Simpan nilai dengan 2 desimal
    exam.jumlahBenar = jumlahBenar;
    exam.jumlahSalah = jumlahSalah;
    exam.lulus = lulus;
    exam.waktuPengerjaan = waktuPengerjaan; // Simpan waktu pengerjaan aktual
    exam.status = "completed"; // Pastikan status diubah menjadi completed

    // Hapus timeout yang terkait jika ujian sudah selesai
    if (app.locals.examTimeouts[examId]) {
        clearTimeout(app.locals.examTimeouts[examId]);
        delete app.locals.examTimeouts[examId];
    }

    console.log(`Ujian ${examId} selesai. Nama: ${exam.nama}, Benar: ${jumlahBenar}, Salah: ${jumlahSalah}, Nilai: ${nilai.toFixed(2)}`);
}

/**
 * Route untuk submit jawaban ujian dari test.html.
 */
app.post('/submit-exam/:examId', (req, res) => {
    const examId = req.params.examId;
    const exam = app.locals.exams[examId];

    if (!exam || exam.status !== "in-progress") {
        return res.status(404).json({ error: "Ujian tidak ditemukan atau sudah selesai." });
    }

    // Ambil jawaban pengguna dari req.body
    const userAnswers = {};
    Object.keys(req.body).forEach(key => {
        if (key.startsWith('question-')) {
            userAnswers[key] = req.body[key];
        }
    });
    exam.answers = userAnswers; // Simpan jawaban pengguna di objek ujian

    // Hitung waktu pengerjaan aktual dalam menit
    const waktuPengerjaan = Math.floor((Date.now() - exam.startTime) / (60 * 1000));

    // Panggil fungsi perhitungan hasil
    calculateExamResults(examId, exam, userAnswers, waktuPengerjaan);

    // Kirim respons sukses ke frontend
    res.json({
        success: true,
        nilai: exam.nilai,
        jumlahBenar: exam.jumlahBenar,
        jumlahSalah: exam.jumlahSalah,
        lulus: exam.lulus,
        waktuPengerjaan: exam.waktuPengerjaan
    });
});


/**
 * Route untuk mendapatkan semua hasil ujian yang telah selesai.
 * Digunakan oleh log.html.
 */
app.get('/exam-results', (req, res) => {
    try {
        // Ambil semua ujian yang sudah selesai dan memiliki nilai
        const results = Object.values(app.locals.exams)
            .filter(exam => exam.status === "completed" && exam.hasOwnProperty('nilai'))
            .map(exam => ({
                nama: exam.nama,
                alamat: exam.alamat,
                nilai: exam.nilai,
                jumlahBenar: exam.jumlahBenar,
                jumlahSalah: exam.jumlahSalah,
                lulus: exam.lulus,
                waktuPengerjaan: exam.waktuPengerjaan,
                timestamp: exam.startTime // Untuk sorting dan tampilan tanggal
            }));

        // Urutkan hasil berdasarkan waktu mulai (terbaru di atas)
        results.sort((a, b) => b.timestamp - a.timestamp);

        res.json(results);
    } catch (error) {
        console.error("Error getting exam results:", error);
        res.status(500).json({ error: "Gagal mengambil hasil ujian" });
    }
});

// Menjalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

// Menangani sinyal untuk mematikan server dengan bersih
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    logStream.end(); // Tutup stream log
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    logStream.end(); // Tutup stream log
    process.exit(0);
});
