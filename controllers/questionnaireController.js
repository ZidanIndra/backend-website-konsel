import Questionnaire from '../models/Questionnaire.js';
import Question from '../models/Question.js';
import { sequelize } from '../db/sequelize.js';
import { toMongoDoc, toMongoLeanDoc } from '../utils/mongoCompat.js';
import { Op } from 'sequelize';

const DEFAULT_RANGES = [
  { key: 'rendah', label: 'Rendah', minScore: 32, maxScore: 74 },
  { key: 'sedang', label: 'Sedang', minScore: 75, maxScore: 117 },
  { key: 'tinggi', label: 'Tinggi', minScore: 118, maxScore: 160 },
];

function normalizeRanges(ranges) {
  let input = ranges;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      return DEFAULT_RANGES;
    }
  }
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_RANGES;
  return input.map((r, idx) => {
    const key = r.key || r.label?.toLowerCase() || `level_${idx + 1}`;
    const label = r.label || r.key || 'Level';

    const hasScore =
      r.minScore != null ||
      r.maxScore != null ||
      r.min_score != null ||
      r.max_score != null;
    const hasPercent =
      r.minPercent != null ||
      r.maxPercent != null ||
      r.min_percent != null ||
      r.max_percent != null;

    if (hasScore || !hasPercent) {
      return {
        key,
        label,
        minScore: Number(r.minScore ?? r.min_score ?? r.min ?? 0),
        maxScore: Number(r.maxScore ?? r.max_score ?? r.max ?? 0),
        minPercent: null,
        maxPercent: null,
      };
    }

    return {
      key,
      label,
      minScore: null,
      maxScore: null,
      minPercent: Number(r.minPercent ?? r.min_percent ?? r.min ?? 0),
      maxPercent: Number(r.maxPercent ?? r.max_percent ?? r.max ?? 100),
    };
  });
}

export async function getAll(req, res) {
  try {
    const items = await Questionnaire.findAll({ order: [['createdAt', 'DESC']] });

    const result = items.map((q) => toMongoLeanDoc(q));
    return res.json({ success: true, message: 'Questionnaires fetched.', data: result });
  } catch (err) {
    console.error('getQuestionnaires error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function getActive(req, res) {
  try {
    const activeRow = await Questionnaire.findOne({ where: { isActive: true } });
    if (!activeRow) {
      return res.json({ success: true, message: 'No active questionnaire.', data: null });
    }

    const questions = await Question.findAll({
      where: { questionnaireId: activeRow.id },
      order: [['orderNo', 'ASC']],
    });

    const active = toMongoLeanDoc(activeRow);

    return res.json({
      success: true,
      message: 'Active questionnaire fetched.',
      data: {
        ...active,
        questions: questions.map((q) => ({
          id: q.publicId,
          _id: q.publicId,
          questionnaire_id: activeRow.publicId,
          question_text: q.questionText,
          question_type: q.questionType || 'scale',
          order_no: q.orderNo,
          weight: Number(q.weight ?? 1),
          scoring_type: q.scoringType || 'favorable',
          manual_scores: q.manualScores || null,
        })),
      },
    });
  } catch (err) {
    console.error('getActiveQuestionnaire error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function getOne(req, res) {
  try {
    const { id } = req.params;
    const questionnaireRow = await Questionnaire.findOne({ where: { publicId: id } });
    if (!questionnaireRow) {
      return res.status(404).json({ success: false, message: 'Questionnaire not found.', data: null });
    }

    const questions = await Question.findAll({ where: { questionnaireId: questionnaireRow.id }, order: [['orderNo', 'ASC']] });

    const questionnaire = toMongoLeanDoc(questionnaireRow);
    const questionDocs = questions.map((q) => {
      const doc = toMongoLeanDoc(q);
      doc.questionnaireId = questionnaireRow.publicId;
      if (doc.weight !== undefined) doc.weight = Number(doc.weight);
      return doc;
    });

    return res.json({
      success: true,
      message: 'Questionnaire fetched.',
      data: { ...questionnaire, questions: questionDocs },
    });
  } catch (err) {
    console.error('getQuestionnaire error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function create(req, res) {
  try {
    const { title, description, instructions, scale_min, scale_max, result_ranges, is_active } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.', data: null });
    }

    const questionnaireRow = await sequelize.transaction(async (t) => {
      if (is_active) {
        await Questionnaire.update({ isActive: false }, { where: {}, transaction: t });
      }

      return await Questionnaire.create(
        {
          title: title.trim(),
          description: description?.trim() || null,
          instructions: instructions?.trim() || null,
          scaleMin: Number(scale_min ?? 1),
          scaleMax: Number(scale_max ?? 5),
          resultRanges: normalizeRanges(result_ranges),
          isActive: Boolean(is_active),
        },
        { transaction: t }
      );
    });

    return res.status(201).json({ success: true, message: 'Questionnaire created.', data: toMongoDoc(questionnaireRow) });
  } catch (err) {
    console.error('createQuestionnaire error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const { title, description, instructions, scale_min, scale_max, result_ranges, is_active } = req.body;

    const existing = await Questionnaire.findOne({ where: { publicId: id }, attributes: ['id'] });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Questionnaire not found.', data: null });
    }

    const updates = {};
    if (title !== undefined) updates.title = String(title || '').trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (instructions !== undefined) updates.instructions = instructions?.trim() || null;
    if (scale_min !== undefined) updates.scaleMin = Number(scale_min);
    if (scale_max !== undefined) updates.scaleMax = Number(scale_max);
    if (result_ranges !== undefined) updates.resultRanges = normalizeRanges(result_ranges);
    if (is_active !== undefined) updates.isActive = Boolean(is_active);

    await sequelize.transaction(async (t) => {
      if (is_active !== undefined && Boolean(is_active)) {
        await Questionnaire.update(
          { isActive: false },
          { where: { id: { [Op.ne]: existing.id } }, transaction: t }
        );
      }

      await Questionnaire.update(updates, { where: { id: existing.id }, transaction: t });
    });

    const refreshed = await Questionnaire.findByPk(existing.id);
    return res.json({ success: true, message: 'Questionnaire updated.', data: toMongoDoc(refreshed) });
  } catch (err) {
    console.error('updateQuestionnaire error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const questionnaire = await Questionnaire.findOne({ where: { publicId: id }, attributes: ['id'] });
    if (!questionnaire) {
      return res.status(404).json({ success: false, message: 'Questionnaire not found.', data: null });
    }

    await sequelize.transaction(async (t) => {
      await Question.destroy({ where: { questionnaireId: questionnaire.id }, transaction: t });
      await Questionnaire.destroy({ where: { id: questionnaire.id }, transaction: t });
    });

    return res.json({ success: true, message: 'Questionnaire deleted.', data: null });
  } catch (err) {
    console.error('deleteQuestionnaire error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
