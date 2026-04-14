import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class ImageAsset extends Model {}

ImageAsset.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    ownerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      field: 'owner_id',
    },
    purpose: {
      type: DataTypes.ENUM('avatar', 'article_banner', 'article_inline', 'generic'),
      allowNull: false,
      defaultValue: 'generic',
    },
    imageBase64: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      field: 'image_base64',
    },
    imageType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'image_type',
    },
    imageSize: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'image_size',
    },
  },
  {
    sequelize,
    tableName: 'image_assets',
    modelName: 'ImageAsset',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { fields: ['owner_id', 'purpose', 'created_at'] },
    ],
  }
);

export default ImageAsset;

