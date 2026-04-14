import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class Question extends Model {}

Question.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    questionnaireId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'questionnaire_id',
    },
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'question_text',
    },
    questionType: {
      type: DataTypes.ENUM('scale', 'essay'),
      allowNull: false,
      defaultValue: 'scale',
      field: 'question_type',
    },
    scoringType: {
      type: DataTypes.ENUM('favorable', 'unfavorable', 'manual'),
      allowNull: false,
      defaultValue: 'favorable',
      field: 'scoring_type',
    },
    manualScores: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      field: 'manual_scores',
    },
    weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    orderNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'order_no',
    },
  },
  {
    sequelize,
    tableName: 'questions',
    modelName: 'Question',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { fields: ['questionnaire_id', 'order_no'] },
    ],
  }
);

export default Question;

