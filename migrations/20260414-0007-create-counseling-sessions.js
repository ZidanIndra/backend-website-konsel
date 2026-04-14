import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'counseling_sessions',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      student_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      teacher_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      open_to_all: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      status: {
        type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      video_link: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
      session_date: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('counseling_sessions', ['public_id'], {
    unique: true,
    name: 'counseling_sessions_public_id_uq',
  });
  await queryInterface.addIndex('counseling_sessions', ['student_id'], { name: 'counseling_sessions_student_idx' });
  await queryInterface.addIndex('counseling_sessions', ['teacher_id'], { name: 'counseling_sessions_teacher_idx' });
  await queryInterface.addIndex('counseling_sessions', ['status'], { name: 'counseling_sessions_status_idx' });
  await queryInterface.addIndex('counseling_sessions', ['updated_at'], { name: 'counseling_sessions_updated_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('counseling_sessions');
};

