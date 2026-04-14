import Questionnaire from '../models/Questionnaire.js';

const DEFAULT_QUESTIONNAIRE = {
  title: 'KUESIONER TRAUMA (Adaptasi ICD-11 - Versi Laporan Diri)',
  description:
    'Skrining awal kondisi psikologis pasca trauma pada siswa menggunakan adaptasi kuesioner ICD-11 PTSD.',
  instructions:
    'Skala Penilaian: 1 = Sangat Tidak Sesuai, 2 = Tidak Sesuai, 3 = Kadang-kadang, 4 = Sesuai, 5 = Sangat Sesuai',
  scaleMin: 1,
  scaleMax: 5,
  resultRanges: [
    { key: 'rendah', label: 'Rendah', minScore: 32, maxScore: 74 },
    { key: 'sedang', label: 'Sedang', minScore: 75, maxScore: 117 },
    { key: 'tinggi', label: 'Tinggi', minScore: 118, maxScore: 160 },
  ],
  isActive: true,
};

export async function ensureActiveQuestionnaire() {
  let questionnaire = await Questionnaire.findOne({ where: { isActive: true } });
  if (!questionnaire) {
    questionnaire = await Questionnaire.create(DEFAULT_QUESTIONNAIRE);
  }
  return questionnaire;
}
