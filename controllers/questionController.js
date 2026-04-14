import Question from '../models/Question.js';
import Questionnaire from '../models/Questionnaire.js';
import { ensureActiveQuestionnaire } from '../utils/questionnaire.js';
import { Op } from 'sequelize';

// ============================================================
// Question Controller — Converted from api/questions/index.php
// ============================================================

/**
 * GET /api/questions?questionnaire_id=X
 * Get all questions for a questionnaire
 */
export async function getAll(req, res) {
  try {
    const qId = req.query.questionnaire_id;

    // Resolve questionnaire by its public id (24-hex) if provided.
    let questionnaire;
    if (qId && qId.match(/^[0-9a-fA-F]{24}$/)) {
      questionnaire = await Questionnaire.findOne({ where: { publicId: qId } });
    }
    if (!questionnaire) {
      // Default: get or create active questionnaire
      questionnaire = await ensureActiveQuestionnaire();
    }

    if (!questionnaire) {
      return res.json({ success: true, message: 'Questions fetched.', data: [] });
    }

    const questions = await Question.findAll({
      where: { questionnaireId: questionnaire.id },
      order: [['orderNo', 'ASC']],
    });

    const result = questions.map((q) => ({
      id: q.publicId,
      _id: q.publicId,
      questionnaire_id: questionnaire.publicId,
      question_text: q.questionText,
      question_type: q.questionType || 'scale',
      order_no: q.orderNo,
      weight: Number(q.weight ?? 1),
      scoring_type: q.scoringType || 'favorable',
      manual_scores: q.manualScores || null,
      questionnaire_title: questionnaire.title,
      created_at: q.createdAt,
      updated_at: q.updatedAt,
    }));

    return res.json({ success: true, message: 'Questions fetched.', data: result });
  } catch (err) {
    console.error('getQuestions error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/questions/:id
 * Get single question
 */
export async function getOne(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findOne({
      where: { publicId: id },
      include: [{ model: Questionnaire, as: 'questionnaire', attributes: ['publicId'] }],
    });

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.', data: null });
    }

    const result = {
      id: question.publicId,
      _id: question.publicId,
      questionnaire_id: question.questionnaire?.publicId || null,
      question_text: question.questionText,
      question_type: question.questionType || 'scale',
      order_no: question.orderNo,
      weight: Number(question.weight ?? 1),
      scoring_type: question.scoringType || 'favorable',
      manual_scores: question.manualScores || null,
      created_at: question.createdAt,
      updated_at: question.updatedAt,
    };

    return res.json({ success: true, message: 'Question fetched.', data: result });
  } catch (err) {
    console.error('getQuestion error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * POST /api/questions
 * Create question (teacher/admin only)
 */
export async function create(req, res) {
  try {
    const {
      questionnaire_id,
      questionnaireId: questionnaireIdRaw,
      question_text,
      order_no,
      weight,
      question_type,
      scoring_type,
      manual_scores,
    } = req.body;

    if (!question_text?.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required.', data: null });
    }

    // Find questionnaire
    let questionnaireId;
    const qIdValue = questionnaire_id || questionnaireIdRaw;
    if (qIdValue && qIdValue.match?.(/^[0-9a-fA-F]{24}$/)) {
      const q = await Questionnaire.findOne({ where: { publicId: qIdValue }, attributes: ['id'] });
      questionnaireId = q?.id || null;
    } else {
      const defaultQ = await ensureActiveQuestionnaire();
      questionnaireId = defaultQ?.id;
    }

    if (!questionnaireId) {
      return res.status(400).json({
        success: false,
        message: 'Questionnaire belum tersedia.',
        data: null,
      });
    }

    // Auto set order_no if not provided
    let finalOrderNo = parseInt(order_no) || 0;
    if (finalOrderNo === 0) {
      const maxOrder = await Question.findOne({
        where: { questionnaireId },
        order: [['orderNo', 'DESC']],
        attributes: ['orderNo'],
      });
      finalOrderNo = (maxOrder?.orderNo || 0) + 1;
    }

    const normalizeManualScores = (input) => {
      let val = input;
      if (typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch {
          return null;
        }
      }
      if (!Array.isArray(val)) return null;
      const nums = val.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      return nums.length ? nums : null;
    };

    const allowedScoring = new Set(['favorable', 'unfavorable', 'manual']);
    const scoringType =
      question_type === 'essay'
        ? 'favorable'
        : (allowedScoring.has(String(scoring_type)) ? String(scoring_type) : 'favorable');

    const question = await Question.create({
      questionnaireId,
      questionText: question_text.trim(),
      questionType: question_type === 'essay' ? 'essay' : 'scale',
      scoringType,
      manualScores: scoringType === 'manual' ? normalizeManualScores(manual_scores) : null,
      orderNo: finalOrderNo,
      weight: Number.isFinite(Number(weight))
        ? Number(weight)
        : (question_type === 'essay' ? 0 : 1),
    });

    const questionnaire = await Questionnaire.findByPk(questionnaireId, { attributes: ['publicId'] });

    const result = {
      id: question.publicId,
      _id: question.publicId,
      questionnaire_id: questionnaire?.publicId || null,
      question_text: question.questionText,
      question_type: question.questionType || 'scale',
      order_no: question.orderNo,
      weight: Number(question.weight ?? 1),
      scoring_type: question.scoringType || 'favorable',
      manual_scores: question.manualScores || null,
      created_at: question.createdAt,
      updated_at: question.updatedAt,
    };

    return res.status(201).json({ success: true, message: 'Question created.', data: result });
  } catch (err) {
    console.error('createQuestion error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * PUT /api/questions/:id
 * Update question (teacher/admin only)
 */
export async function update(req, res) {
  try {
    const { id } = req.params;
    const { question_text, order_no, weight, question_type, scoring_type, manual_scores } = req.body;

    if (!question_text?.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required.', data: null });
    }

    const question = await Question.findOne({ where: { publicId: id } });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.', data: null });
    }

    const updates = { questionText: question_text.trim() };

    if (question_type !== undefined) {
      updates.questionType = question_type === 'essay' ? 'essay' : 'scale';
    }
    if (order_no !== undefined) {
      updates.orderNo = parseInt(order_no);
    }
    if (weight !== undefined) {
      const w = Number(weight);
      if (Number.isFinite(w)) updates.weight = w;
    }
    if (scoring_type !== undefined) {
      const allowedScoring = new Set(['favorable', 'unfavorable', 'manual']);
      const next = allowedScoring.has(String(scoring_type)) ? String(scoring_type) : 'favorable';
      updates.scoringType = next;
      if (next !== 'manual') updates.manualScores = null;
    }
    if (manual_scores !== undefined) {
      let val = manual_scores;
      if (typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch {
          val = null;
        }
      }
      if (Array.isArray(val)) {
        const nums = val.map((n) => Number(n)).filter((n) => Number.isFinite(n));
        updates.manualScores = nums.length ? nums : null;
      } else if (val === null) {
        updates.manualScores = null;
      }
    }

    await Question.update(updates, { where: { id: question.id } });
    const updated = await Question.findByPk(question.id);

    const questionnaire = await Questionnaire.findByPk(updated.questionnaireId, { attributes: ['publicId'] });

    const result = {
      id: updated.publicId,
      _id: updated.publicId,
      questionnaire_id: questionnaire?.publicId || null,
      question_text: updated.questionText,
      question_type: updated.questionType || 'scale',
      order_no: updated.orderNo,
      weight: Number(updated.weight ?? 1),
      scoring_type: updated.scoringType || 'favorable',
      manual_scores: updated.manualScores || null,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };

    return res.json({ success: true, message: 'Question updated.', data: result });
  } catch (err) {
    console.error('updateQuestion error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * DELETE /api/questions/:id
 * Delete question (teacher/admin only)
 */
export async function deleteQuestion(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findOne({ where: { publicId: id }, attributes: ['id'] });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.', data: null });
    }

    await Question.destroy({ where: { id: question.id } });
    return res.json({ success: true, message: 'Question deleted.', data: null });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
