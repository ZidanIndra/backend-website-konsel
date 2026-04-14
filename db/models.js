import Article from '../models/Article.js';
import ChatMessage from '../models/ChatMessage.js';
import CounselingSession from '../models/CounselingSession.js';
import ImageAsset from '../models/ImageAsset.js';
import Page from '../models/Page.js';
import Question from '../models/Question.js';
import Questionnaire from '../models/Questionnaire.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import QuestionnaireResponseAnswer from '../models/QuestionnaireResponseAnswer.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';

// Associations (numeric FK)
User.belongsTo(ImageAsset, { as: 'avatarImage', foreignKey: 'avatarImageId' });

ImageAsset.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

Article.belongsTo(User, { as: 'author', foreignKey: 'authorId' });
Article.belongsTo(ImageAsset, { as: 'thumbnailImage', foreignKey: 'thumbnailImageId' });

Page.belongsTo(User, { as: 'createdByUser', foreignKey: 'createdBy' });
Page.belongsTo(User, { as: 'updatedByUser', foreignKey: 'updatedBy' });

CounselingSession.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
CounselingSession.belongsTo(User, { as: 'teacher', foreignKey: 'teacherId' });

ChatMessage.belongsTo(CounselingSession, { as: 'session', foreignKey: 'sessionId' });
ChatMessage.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

Questionnaire.hasMany(Question, { as: 'questions', foreignKey: 'questionnaireId' });
Question.belongsTo(Questionnaire, { as: 'questionnaire', foreignKey: 'questionnaireId' });

QuestionnaireResponse.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
QuestionnaireResponse.belongsTo(Questionnaire, { as: 'questionnaire', foreignKey: 'questionnaireId' });
QuestionnaireResponse.hasMany(QuestionnaireResponseAnswer, { as: 'answers', foreignKey: 'responseId' });

QuestionnaireResponseAnswer.belongsTo(QuestionnaireResponse, { as: 'response', foreignKey: 'responseId' });
QuestionnaireResponseAnswer.belongsTo(Question, { as: 'question', foreignKey: 'questionId' });

// Re-export for scripts/tools/tests
export {
  Article,
  ChatMessage,
  CounselingSession,
  ImageAsset,
  Page,
  Question,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireResponseAnswer,
  Setting,
  User,
};

