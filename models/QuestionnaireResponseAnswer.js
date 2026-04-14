import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class QuestionnaireResponseAnswer extends Model {}

QuestionnaireResponseAnswer.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    responseId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'response_id' },
    questionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'question_id' },
    answerValue: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'answer_value' },
    textAnswer: { type: DataTypes.TEXT, allowNull: true, defaultValue: null, field: 'text_answer' },
  },
  {
    sequelize,
    tableName: 'questionnaire_response_answers',
    modelName: 'QuestionnaireResponseAnswer',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { fields: ['response_id'] },
      { fields: ['question_id'] },
    ],
  }
);

export default QuestionnaireResponseAnswer;

