import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class ChatMessage extends Model {}

ChatMessage.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    sessionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'session_id',
    },
    senderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'sender_id',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
  },
  {
    sequelize,
    tableName: 'chat_messages',
    modelName: 'ChatMessage',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { fields: ['session_id', 'created_at'] },
      { fields: ['sender_id'] },
      { fields: ['session_id', 'is_read'] },
    ],
  }
);

export default ChatMessage;

