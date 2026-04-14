import '../config/env.js';
import connectDB from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { sequelize } from '../db/sequelize.js';

// Models
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import Questionnaire from '../models/Questionnaire.js';
import Question from '../models/Question.js';
import Article from '../models/Article.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import QuestionnaireResponseAnswer from '../models/QuestionnaireResponseAnswer.js';
import CounselingSession from '../models/CounselingSession.js';
import ChatMessage from '../models/ChatMessage.js';
import ImageAsset from '../models/ImageAsset.js';
import Page from '../models/Page.js';

// ============================================================
// Database Seeder
// Equivalent to the SQL INSERT statements in schema.sql
// ============================================================

async function seed() {
  try {
    await connectDB();
    console.log('🌱 Starting database seed...\n');

    await sequelize.transaction(async (t) => {
      // Clear existing data (order matters due to FKs)
      await ChatMessage.destroy({ where: {}, transaction: t });
      await CounselingSession.destroy({ where: {}, transaction: t });
      await QuestionnaireResponseAnswer.destroy({ where: {}, transaction: t });
      await QuestionnaireResponse.destroy({ where: {}, transaction: t });
      await Question.destroy({ where: {}, transaction: t });
      await Questionnaire.destroy({ where: {}, transaction: t });
      await Article.destroy({ where: {}, transaction: t });
      await Page.destroy({ where: {}, transaction: t });
      await Setting.destroy({ where: {}, transaction: t });
      await ImageAsset.destroy({ where: {}, transaction: t });
      await User.destroy({ where: {}, transaction: t });
    });

    console.log('🗑️  Cleared existing data.');

    // ── Seed Users ───────────────────────────────────────────
    const adminPassword = await hashPassword('admin123', 10);
    const guruPassword = await hashPassword('guru123', 10);
    const siswaPassword = await hashPassword('siswa123', 10);

    const admin = await User.create({
      name: 'Administrator',
      email: 'admin@konseling.sch.id',
      password: adminPassword,
      role: 'admin',
    });

    const guru = await User.create({
      name: 'Siti Rahmawati, S.Pd',
      email: 'guru@konseling.sch.id',
      password: guruPassword,
      role: 'teacher',
      phone: '081234567890',
    });

    const siswa = await User.create({
      name: 'Ahmad Fauzi',
      email: 'siswa@konseling.sch.id',
      password: siswaPassword,
      role: 'student',
      class: 'XII IPA 1',
    });

    console.log('✅ Users seeded (admin, guru, siswa)');

    // ── Seed Settings ────────────────────────────────────────
    const settingsData = [
      { setting_key: 'site_name', setting_value: 'BK REBT Care' },
      { setting_key: 'school_name', setting_value: 'SMA Negeri 1 Contoh' },
      { setting_key: 'school_address', setting_value: 'Jl. Pendidikan No. 1, Kota Contoh, Jawa Tengah' },
      { setting_key: 'school_phone', setting_value: '(0281) 123-4567' },
      { setting_key: 'school_email', setting_value: 'info@smancontoh.sch.id' },
      { setting_key: 'vision', setting_value: 'Mewujudkan insan yang beriman, berilmu, dan berkarakter mulia dalam naungan bimbingan konseling yang profesional dan inovatif.' },
      { setting_key: 'mission', setting_value: 'Memberikan layanan bimbingan dan konseling yang profesional, inovatif, dan berkeadilan untuk membantu siswa berkembang secara optimal dalam aspek akademik, sosial, dan emosional.' },
      { setting_key: 'about_app', setting_value: 'Aplikasi Bimbingan Konseling REBT adalah platform digital yang dirancang khusus untuk membantu siswa dalam mengatasi stres, trauma, dan masalah emosional menggunakan pendekatan Rational Emotive Behavior Therapy (REBT).' },
      { setting_key: 'logo', setting_value: '' },
      { setting_key: 'hero_tagline', setting_value: 'Cerita Masalahmu, Kami Siap Mendengar' },
      {
        setting_key: 'portal_landing_json',
        setting_value: JSON.stringify({
          blocks: [
            {
              type: 'heroHighlight',
              props: {
                imageUrl: '',
                imageAlt: 'Foto Kepala Sekolah',
                name: 'Nama Kepala Sekolah',
                role: 'Kepala Sekolah',
                heading: 'Sambutan, Visi, dan Misi',
                sections: [
                  { title: 'Sambutan', content: 'Tuliskan sambutan kepala sekolah di sini.' },
                  { title: 'Visi', content: 'Tuliskan visi sekolah di sini.' },
                  { title: 'Misi', content: 'Tuliskan misi sekolah di sini.' },
                ],
              },
            },
          ],
        }),
      },
    ];
    await Setting.bulkCreate(settingsData);
    console.log('✅ Settings seeded');

    // ── Seed Questionnaire ───────────────────────────────────
    const questionnaire = await Questionnaire.create({
      title: 'KUESIONER TRAUMA (Adaptasi ICD-11 – Versi Laporan Diri)',
      description: 'Skrining awal kondisi psikologis pasca trauma pada siswa menggunakan adaptasi kuesioner ICD-11 PTSD.',
      instructions:
        'Di bawah ini adalah masalah yang mungkin dialami seseorang setelah peristiwa traumatis. Bacalah setiap pertanyaan dengan seksama dan pilih jawaban yang paling sesuai.\n\nSkala Penilaian:\n1 = Sangat Tidak Sesuai\n2 = Tidak Sesuai\n3 = Kadang-kadang\n4 = Sesuai\n5 = Sangat Sesuai',
      scaleMin: 1,
      scaleMax: 5,
      resultRanges: [
        { key: 'rendah', label: 'Rendah', minScore: 32, maxScore: 74 },
        { key: 'sedang', label: 'Sedang', minScore: 75, maxScore: 117 },
        { key: 'tinggi', label: 'Tinggi', minScore: 118, maxScore: 160 },
      ],
      isActive: true,
    });
    console.log('✅ Questionnaire seeded');

    // ── Seed Questions ───────────────────────────────────────
    const questionsData = [
      'Saya mengalami mimpi buruk yang berulang tentang peristiwa traumatis yang pernah saya alami.',
      'Saya mengalami kilas balik (flashback) — seolah-olah saya kembali mengalami peristiwa traumatis tersebut.',
      'Saya berusaha menghindari pikiran atau perasaan yang berkaitan dengan peristiwa traumatis.',
      'Saya menghindari tempat, orang, atau situasi yang mengingatkan saya pada peristiwa traumatis.',
      'Saya merasa sangat waspada atau selalu berjaga-jaga terhadap bahaya di sekitar saya.',
      'Saya mudah terkejut atau kaget oleh suara atau kejadian yang tidak terduga.',
      'Saya sulit untuk merasa tenang atau rileks, bahkan di lingkungan yang aman.',
      'Saya merasa mati rasa secara emosional atau tidak bisa merasakan perasaan positif seperti kebahagiaan atau cinta.',
      'Saya merasa diri saya adalah orang yang gagal atau tidak berharga.',
      'Saya merasa bersalah atau malu atas peristiwa traumatis yang terjadi.',
      'Saya sulit untuk merasa dekat atau terhubung secara emosional dengan orang-orang di sekitar saya.',
      'Saya cenderung menghindari hubungan yang dekat atau intim dengan orang lain.',
      'Peristiwa traumatis telah mengganggu hubungan sosial saya dengan teman dan keluarga.',
      'Peristiwa traumatis telah mengganggu aktivitas belajar atau kehidupan sekolah saya.',
    ];

    const questionDocs = questionsData.map((text, index) => ({
      questionnaireId: questionnaire.id,
      questionText: text,
      orderNo: index + 1,
    }));
    await Question.bulkCreate(questionDocs);
    console.log('✅ Questions seeded (14 PTSD questions)');

    // ── Seed Articles ────────────────────────────────────────
    const articlesData = [
      {
        title: 'Apa itu REBT? Mengenal Rational Emotive Behavior Therapy',
        slug: 'apa-itu-rebt',
        content:
          '<p>Rational Emotive Behavior Therapy (REBT) adalah pendekatan psikoterapi yang dikembangkan oleh psikolog Albert Ellis pada tahun 1955. REBT berfokus pada bagaimana pikiran irasional dapat mempengaruhi perasaan dan perilaku kita.</p><h2>Prinsip Dasar REBT</h2><p>REBT menggunakan model ABC untuk menjelaskan gangguan emosional:</p><ul><li><strong>A (Activating Event)</strong> — Peristiwa pemicu</li><li><strong>B (Belief)</strong> — Keyakinan tentang peristiwa tersebut</li><li><strong>C (Consequence)</strong> — Konsekuensi emosional dan perilaku</li></ul><p>Tujuan utama REBT adalah membantu individu mengubah keyakinan irasional menjadi keyakinan yang lebih rasional dan adaptif.</p><h2>Manfaat REBT bagi Siswa</h2><p>Bagi siswa yang mengalami stres atau trauma, REBT dapat membantu untuk mengelola emosi dengan lebih baik, mengurangi kecemasan dan depresi, meningkatkan kepercayaan diri, dan membangun ketangguhan mental.</p>',
        category: 'REBT',
        authorId: admin.id,
        isPublished: true,
      },
      {
        title: 'Mengenali Gejala PTSD dan Cara Mengatasinya',
        slug: 'mengenali-gejala-ptsd',
        content:
          '<p>Post-Traumatic Stress Disorder (PTSD) adalah kondisi kesehatan mental yang dapat berkembang setelah seseorang mengalami atau menyaksikan peristiwa traumatis.</p><h2>Gejala Umum PTSD</h2><p>Gejala PTSD dapat dibagi menjadi empat kategori utama:</p><ul><li><strong>Intrusi</strong> — Mimpi buruk, flashback, pikiran yang mengganggu</li><li><strong>Penghindaran</strong> — Menghindari pengingat trauma</li><li><strong>Perubahan kognitif dan mood</strong> — Pikiran negatif, perasaan bersalah</li><li><strong>Perubahan arousal</strong> — Kewaspadaan berlebih, mudah terkejut</li></ul><h2>Langkah Mengatasi PTSD</h2><p>Jika kamu merasa mengalami gejala-gejala di atas, penting untuk segera mencari bantuan profesional. Konseling dengan guru BK adalah langkah pertama yang tepat.</p>',
        category: 'PTSD',
        authorId: admin.id,
        isPublished: true,
      },
      {
        title: 'Tips Menjaga Kesehatan Mental Selama di Sekolah',
        slug: 'tips-kesehatan-mental-sekolah',
        content:
          '<p>Menjaga kesehatan mental sama pentingnya dengan menjaga kesehatan fisik. Berikut adalah beberapa tips yang dapat membantu kamu menjaga kesehatan mental selama di sekolah.</p><h2>1. Kelola Stres dengan Baik</h2><p>Belajar teknik pernapasan dalam, meditasi singkat, atau olahraga ringan dapat membantu mengurangi tingkat stres.</p><h2>2. Jaga Hubungan Sosial yang Positif</h2><p>Bergaul dengan teman-teman yang suportif dan positif sangat penting untuk kesehatan mental.</p><h2>3. Cukup Istirahat</h2><p>Tidur yang cukup (7-9 jam per hari) sangat penting untuk fungsi kognitif dan emosional yang optimal.</p><h2>4. Bicarakan Masalahmu</h2><p>Jangan ragu untuk berbicara dengan guru BK atau orang yang kamu percaya jika kamu merasa kewalahan.</p>',
        category: 'Tips Kesehatan Mental',
        authorId: admin.id,
        isPublished: true,
      },
    ];
    await Article.bulkCreate(articlesData);
    console.log('✅ Articles seeded (3 articles)');

    // ── Summary ──────────────────────────────────────────────
    console.log('\n🎉 Database seed completed successfully!');
    console.log('────────────────────────────────────────');
    console.log('Login credentials:');
    console.log('  Admin:  admin@konseling.sch.id / admin123');
    console.log('  Guru:   guru@konseling.sch.id  / guru123');
    console.log('  Siswa:  siswa@konseling.sch.id  / siswa123');
    console.log('────────────────────────────────────────');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    try {
      await sequelize.close();
    } catch {}
    process.exit(1);
  }
}

seed();

