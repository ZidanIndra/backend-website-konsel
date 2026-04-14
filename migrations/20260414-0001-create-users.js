import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'users',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: false },
      password: { type: DataTypes.STRING(255), allowNull: false },
      role: { type: DataTypes.ENUM('student', 'teacher', 'admin'), allowNull: false, defaultValue: 'student' },
      class: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },
      phone: { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
      avatar: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      avatar_image_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('users', ['public_id'], { unique: true, name: 'users_public_id_uq' });
  await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_uq' });
  await queryInterface.addIndex('users', ['role'], { name: 'users_role_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('users');
};

