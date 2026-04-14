import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class Setting extends Model {}

Setting.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    setting_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'settings',
    modelName: 'Setting',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { unique: true, fields: ['setting_key'] },
    ],
  }
);

export default Setting;

