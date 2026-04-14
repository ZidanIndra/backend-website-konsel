import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import QuestionnaireResponseAnswer from '../models/QuestionnaireResponseAnswer.js';
import Questionnaire from '../models/Questionnaire.js';
import { ensureActiveQuestionnaire } from '../utils/questionnaire.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import ImageAsset from '../models/ImageAsset.js';
import { buildDataUrl } from '../utils/image.js';
import { Op } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

// ============================================================
// Response Controller - Converted from api/responses/index.php
// ============================================================

/**
 * GET /api/responses
 * Get all questionnaire responses
 */
export async function getAll(req, res) {
  try {
    const user = req.user;
    const userDbId = user?._dbId;
    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const where = {};
    if (user.role === 'student') {
      where.studentId = userDbId;
    } else {
      const { student_id } = req.query;
      if (student_id) {
        const student = await User.findOne({ where: { publicId: student_id }, attributes: ['id'] });
        where.studentId = student?.id || -1;
      }
    }

    const responses = await QuestionnaireResponse.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'publicId', 'name', 'class', 'avatar', 'avatarImageId'] },
        { model: Questionnaire, as: 'questionnaire', attributes: ['publicId', 'title'] },
      ],
      order: [['completedAt', 'DESC']],
    });

    const avatarIds = responses
      .map((r) => r.student?.avatarImageId)
      .filter(Boolean)
      .map((id) => Number(id));

    const avatars = avatarIds.length
      ? await ImageAsset.findAll({
          where: { id: { [Op.in]: avatarIds } },
          attributes: ['id', 'imageType', 'imageBase64'],
        })
      : [];
    const avatarMap = new Map(avatars.map((img) => [img.id, img.get({ plain: true })]));

    const result = responses.map((r) => ({
      id: r.publicId,
      _id: r.publicId,
      student_id: r.student?.publicId || null,
      questionnaire_id: r.questionnaire?.publicId || null,
      total_score: Number(r.totalScore ?? 0),
      max_score: Number(r.maxScore ?? 0),
      percentage: Number(r.percentage ?? 0),
      severity_level: r.severityLevel,
      notes: r.notes,
      completed_at: r.completedAt,
      questionnaire_title: r.questionnaire?.title || null,
      student_name: r.student?.name || null,
      class: r.student?.class || null,
      student_avatar: (() => {
        const img = r.student?.avatarImageId ? avatarMap.get(r.student.avatarImageId) : null;
        return img ? buildDataUrl(img.imageType, img.imageBase64) : r.student?.avatar || null;
      })(),
    }));

    return res.json({ success: true, message: 'Responses fetched.', data: result });
  } catch (err) {
    console.error('getResponses error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/responses/:id
 * Get single response with detailed answers
 */
export async function getOne(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const userDbId = user?._dbId;
    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const response = await QuestionnaireResponse.findOne({
      where: { publicId: id },
      include: [
        { model: User, as: 'student', attributes: ['id', 'publicId', 'name', 'class', 'avatar', 'avatarImageId'] },
        { model: Questionnaire, as: 'questionnaire', attributes: ['publicId', 'title'] },
        {
          model: QuestionnaireResponseAnswer,
          as: 'answers',
          include: [
            {
              model: Question,
              as: 'question',
              attributes: ['publicId', 'questionText', 'orderNo', 'weight', 'questionType', 'scoringType', 'manualScores'],
            },
          ],
        },
      ],
    });

    if (!response) {
      return res.status(404).json({ success: false, message: 'Response not found.', data: null });
    }

    if (user.role === 'student' && Number(response.studentId) !== Number(userDbId)) {
      return res.status(403).json({ success: false, message: 'Forbidden.', data: null });
    }

    let studentAvatar = response.student?.avatar || null;
    if (response.student?.avatarImageId) {
      const img = await ImageAsset.findByPk(response.student.avatarImageId, { attributes: ['imageType', 'imageBase64'] });
      if (img) {
        const p = img.get({ plain: true });
        studentAvatar = buildDataUrl(p.imageType, p.imageBase64);
      }
    }

    const result = {
      id: response.publicId,
      _id: response.publicId,
      student_id: response.student?.publicId || null,
      questionnaire_id: response.questionnaire?.publicId || null,
      total_score: Number(response.totalScore ?? 0),
      max_score: Number(response.maxScore ?? 0),
      percentage: Number(response.percentage ?? 0),
      severity_level: response.severityLevel,
      notes: response.notes,
      completed_at: response.completedAt,
      questionnaire_title: response.questionnaire?.title || null,
      student_name: response.student?.name || null,
      class: response.student?.class || null,
      student_avatar: studentAvatar,
      answers: (response.answers || [])
        .map((a) => ({
          id: a.publicId,
          _id: a.publicId,
          response_id: response.publicId,
          question_id: a.question?.publicId || null,
          answer_value: a.answerValue,
          answer_text: a.textAnswer || null,
          question_text: a.question?.questionText || null,
          order_no: a.question?.orderNo || 0,
          question_type: a.question?.questionType || 'scale',
          question_weight: Number(a.question?.weight ?? 1),
          question_scoring_type: a.question?.scoringType || 'favorable',
          question_manual_scores: a.question?.manualScores || null,
        }))
        .sort((x, y) => x.order_no - y.order_no),
    };

    return res.json({ success: true, message: 'Response fetched.', data: result });
  } catch (err) {
    console.error('getResponse error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * POST /api/responses
 * Submit questionnaire response (student only)
 */
export async function submit(req, res) {
  try {
    const user = req.user;
    const userDbId = user?._dbId;
    const { questionnaire_id, questionnaireId: questionnaireIdRaw, answers } = req.body;

    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Answers are required.', data: null });
    }

    let questionnaireRow = null;
    const qIdValue = questionnaire_id || questionnaireIdRaw;
    if (qIdValue && qIdValue.match?.(/^[0-9a-fA-F]{24}$/)) {
      questionnaireRow = await Questionnaire.findOne({ where: { publicId: qIdValue } });
    }
    if (!questionnaireRow) {
      questionnaireRow = await ensureActiveQuestionnaire();
    }

    if (!questionnaireRow) {
      return res.status(400).json({
        success: false,
        message: 'Questionnaire belum tersedia.',
        data: null,
      });
    }

    const questionnaire = questionnaireRow.get({ plain: true });
    const scaleMin = questionnaire?.scaleMin ?? 0;
    const scaleMax = questionnaire?.scaleMax ?? 4;

    const questionDocs = await Question.findAll({
      where: { questionnaireId: questionnaireRow.id },
      attributes: ['id', 'publicId', 'weight', 'questionType', 'scoringType', 'manualScores'],
    });
    const questionMap = new Map(questionDocs.map((q) => [String(q.publicId), q.get({ plain: true })]));

    const clampScale = (n) => Math.max(scaleMin, Math.min(scaleMax, n));

    const scoreFromValue = (value, qMeta) => {
      const t = qMeta?.scoringType || 'favorable';
      if (t === 'unfavorable') return (scaleMin + scaleMax) - value;
      if (t === 'manual' && Array.isArray(qMeta?.manualScores)) {
        const idx = value - scaleMin;
        const mapped = qMeta.manualScores?.[idx];
        if (Number.isFinite(Number(mapped))) return Number(mapped);
      }
      return value;
    };

    let totalScore = 0;
    const answerRows = [];
    for (const ans of answers) {
      const qId = ans.question_id || ans.questionId;
      const qMeta = qId && questionMap.has(String(qId)) ? questionMap.get(String(qId)) : null;
      const qType = qMeta?.questionType || 'scale';
      const weight = Number.isFinite(Number(qMeta?.weight)) ? Number(qMeta.weight) : 1;
      const textAnswer = typeof ans.text_answer === 'string'
        ? ans.text_answer.trim()
        : (typeof ans.textAnswer === 'string' ? ans.textAnswer.trim() : '');

      if (qType === 'essay' && !textAnswer) {
        return res.status(400).json({ success: false, message: 'Jawaban essay wajib diisi.', data: null });
      }

      let val = scaleMin;
      if (qType === 'scale' || (qType === 'essay' && weight > 0)) {
        const raw = parseInt(ans.value);
        if (!Number.isFinite(raw)) {
          return res.status(400).json({ success: false, message: 'Skor jawaban wajib diisi.', data: null });
        }
        val = clampScale(raw);
      } else if (Number.isFinite(parseInt(ans.value))) {
        val = clampScale(parseInt(ans.value));
      }

      const scoreVal = scoreFromValue(val, qMeta);
      totalScore += scoreVal * weight;

      if (qMeta?.id) {
        answerRows.push({
          questionDbId: qMeta.id,
          answerValue: val,
          textAnswer: textAnswer || null,
        });
      }
    }

    const maxScore = questionDocs.reduce((sum, q) => {
      const qPlain = q.get({ plain: true });
      const qType = qPlain.questionType || 'scale';
      const weight = Number.isFinite(Number(qPlain.weight)) ? Number(qPlain.weight) : 1;
      if (qType === 'essay' && weight <= 0) return sum;

      let maxBase = scaleMax;
      if (qPlain.scoringType === 'manual' && Array.isArray(qPlain.manualScores) && qPlain.manualScores.length) {
        const nums = qPlain.manualScores.map((n) => Number(n)).filter((n) => Number.isFinite(n));
        if (nums.length) maxBase = Math.max(...nums);
      }
      return sum + maxBase * weight;
    }, 0);

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

    const ranges = questionnaire?.resultRanges?.length ? questionnaire.resultRanges : [];
    const hasScoreRanges = ranges.some((r) => r?.minScore != null || r?.maxScore != null);

    let severity = ranges[0]?.key || 'minimal';
    if (hasScoreRanges) {
      for (const r of ranges) {
        const min = Number(r.minScore ?? r.min_score);
        const max = Number(r.maxScore ?? r.max_score);
        if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
        if (totalScore >= min && totalScore <= max) {
          severity = r.key;
          break;
        }
      }
    } else {
      const fallback = ranges.length
        ? ranges
        : [
            { key: 'minimal', minPercent: 0, maxPercent: 20 },
            { key: 'mild', minPercent: 21, maxPercent: 40 },
            { key: 'moderate', minPercent: 41, maxPercent: 60 },
            { key: 'severe', minPercent: 61, maxPercent: 80 },
            { key: 'very_severe', minPercent: 81, maxPercent: 100 },
          ];
      severity = fallback[0]?.key || 'minimal';
      for (const r of fallback) {
        const min = Number(r.minPercent ?? r.min_percent);
        const max = Number(r.maxPercent ?? r.max_percent);
        if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
        if (percentage >= min && percentage <= max) {
          severity = r.key;
          break;
        }
      }
    }

    const response = await sequelize.transaction(async (t) => {
      const responseRow = await QuestionnaireResponse.create(
        {
          studentId: userDbId,
          questionnaireId: questionnaireRow.id,
          totalScore,
          maxScore,
          percentage,
          severityLevel: severity,
          completedAt: new Date(),
        },
        { transaction: t }
      );

      if (answerRows.length > 0) {
        await QuestionnaireResponseAnswer.bulkCreate(
          answerRows.map((a) => ({
            responseId: responseRow.id,
            questionId: a.questionDbId,
            answerValue: a.answerValue,
            textAnswer: a.textAnswer,
          })),
          { transaction: t }
        );
      }

      return responseRow;
    });

    return res.status(201).json({
      success: true,
      message: 'Kuesioner berhasil diserahkan.',
      data: {
        response_id: response.publicId,
        total_score: totalScore,
        severity_level: severity,
        max_score: maxScore,
        percentage,
      },
    });
  } catch (err) {
    console.error('submitResponse error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * DELETE /api/responses/:id
 * Delete questionnaire response
 */
export async function remove(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const userDbId = user?._dbId;
    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const response = await QuestionnaireResponse.findOne({
      where: { publicId: id },
      attributes: ['id', 'studentId'],
    });
    if (!response) {
      return res.status(404).json({ success: false, message: 'Response not found.', data: null });
    }

    if (user.role === 'student' && Number(response.studentId) !== Number(userDbId)) {
      return res.status(403).json({ success: false, message: 'Forbidden.', data: null });
    }

    await QuestionnaireResponse.destroy({ where: { id: response.id } });
    return res.json({ success: true, message: 'Response deleted.', data: null });
  } catch (err) {
    console.error('deleteResponse error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
