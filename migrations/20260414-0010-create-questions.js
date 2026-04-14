import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'questions',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      questionnaire_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'questionnaires', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      question_text: { type: DataTypes.TEXT, allowNull: false },
      question_type: { type: DataTypes.ENUM('scale', 'essay'), allowNull: false, defaultValue: 'scale' },
      scoring_type: {
        type: DataTypes.ENUM('favorable', 'unfavorable', 'manual'),
        allowNull: false,
        defaultValue: 'favorable',
      },
      manual_scores: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
      weight: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
      order_no: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('questions', ['public_id'], { unique: true, name: 'questions_public_id_uq' });
  await queryInterface.addIndex('questions', ['questionnaire_id', 'order_no'], { name: 'questions_q_order_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('questions');
};

