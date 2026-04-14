import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class User extends Model {}

User.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { len: [1, 150] },
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { len: [1, 150] },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { len: [1, 255] },
    },
    role: {
      type: DataTypes.ENUM('student', 'teacher', 'admin'),
      allowNull: false,
      defaultValue: 'student',
    },
    class: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },
    phone: { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
    avatar: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    avatarImageId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null, field: 'avatar_image_id' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { unique: true, fields: ['email'] },
      { fields: ['role'] },
    ],
    hooks: {
      beforeValidate(user) {
        if (typeof user.email === 'string') user.email = user.email.trim().toLowerCase();
        if (typeof user.name === 'string') user.name = user.name.trim();
        if (typeof user.class === 'string') user.class = user.class.trim() || null;
        if (typeof user.phone === 'string') user.phone = user.phone.trim() || null;
      },
    },
  }
);

export default User;

