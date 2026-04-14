import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class Page extends Model {}

Page.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { len: [1, 255] },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { len: [1, 255] },
    },
    excerpt: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    contentHtml: { type: DataTypes.TEXT('long'), allowNull: true, defaultValue: null, field: 'content_html' },
    blocks: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_published' },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null, field: 'updated_by' },
  },
  {
    sequelize,
    tableName: 'pages',
    modelName: 'Page',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { unique: true, fields: ['path'] },
      { fields: ['path'] },
      { fields: ['is_published', 'path'] },
    ],
  }
);

export default Page;

