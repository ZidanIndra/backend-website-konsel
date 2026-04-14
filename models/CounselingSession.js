import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { generatePublicId } from '../utils/publicId.js';

class CounselingSession extends Model {}

CounselingSession.init(
  {
    publicId: {
      type: DataTypes.CHAR(24),
      allowNull: false,
      unique: true,
      field: 'public_id',
      defaultValue: generatePublicId,
    },
    studentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'student_id',
    },
    teacherId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      field: 'teacher_id',
    },
    openToAll: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'open_to_all',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { len: [1, 255] },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    videoLink: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
      field: 'video_link',
      validate: { len: [0, 500] },
    },
    sessionDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'session_date',
    },
  },
  {
    sequelize,
    tableName: 'counseling_sessions',
    modelName: 'CounselingSession',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['public_id'] },
      { fields: ['student_id'] },
      { fields: ['teacher_id'] },
      { fields: ['status'] },
      { fields: ['updated_at'] },
    ],
  }
);

export default CounselingSession;

