import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class Questionnaire extends Model {}

Questionnaire.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { len: [1, 255] },
    },
    description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    instructions: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    scaleMin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'scale_min' },
    scaleMax: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, field: 'scale_max' },
    resultRanges: { type: DataTypes.JSON, allowNull: false, defaultValue: [], field: 'result_ranges' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  },
  {
    sequelize,
    tableName: 'questionnaires',
    modelName: 'Questionnaire',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { fields: ['is_active'] },
    ],
  }
);

export default Questionnaire;

