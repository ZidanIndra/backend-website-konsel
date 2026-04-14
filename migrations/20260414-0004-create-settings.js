import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'settings',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      setting_key: { type: DataTypes.STRING(100), allowNull: false },
      setting_value: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('settings', ['public_id'], { unique: true, name: 'settings_public_id_uq' });
  await queryInterface.addIndex('settings', ['setting_key'], { unique: true, name: 'settings_key_uq' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('settings');
};

