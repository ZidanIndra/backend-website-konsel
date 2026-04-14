import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class QuestionnaireResponse extends Model {}

QuestionnaireResponse.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'student_id' },
    questionnaireId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'questionnaire_id' },
    totalScore: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'total_score' },
    maxScore: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'max_score' },
    percentage: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
    severityLevel: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'minimal', field: 'severity_level' },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    completedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'completed_at' },
  },
  {
    sequelize,
    tableName: 'questionnaire_responses',
    modelName: 'QuestionnaireResponse',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { fields: ['student_id'] },
      { fields: ['questionnaire_id'] },
      { fields: ['completed_at'] },
    ],
  }
);

export default QuestionnaireResponse;

