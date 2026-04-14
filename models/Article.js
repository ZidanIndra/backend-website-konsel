import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class Article extends Model {}

Article.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    title: { type: DataTypes.STRING(255), allowNull: false, validate: { len: [1, 255] } },
    slug: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { len: [1, 255] } },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    thumbnail: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    thumbnailImageId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null, field: 'thumbnail_image_id' },
    category: { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'Kesehatan Mental' },
    authorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'author_id' },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_published' },
  },
  {
    sequelize,
    tableName: 'articles',
    modelName: 'Article',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { unique: true, fields: ['slug'] },
      { fields: ['category'] },
      { fields: ['author_id'] },
      { fields: ['is_published'] },
      { fields: ['created_at'] },
    ],
  }
);

export default Article;

