import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'questionnaires',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      instructions: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      scale_min: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      scale_max: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      result_ranges: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('questionnaires', ['public_id'], { unique: true, name: 'questionnaires_public_id_uq' });
  await queryInterface.addIndex('questionnaires', ['is_active'], { name: 'questionnaires_active_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('questionnaires');
};

