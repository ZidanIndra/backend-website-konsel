import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'questionnaire_responses',
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
      questionnaire_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'questionnaires', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      total_score: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      max_score: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      percentage: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
      severity_level: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'minimal' },
      notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      completed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('questionnaire_responses', ['public_id'], {
    unique: true,
    name: 'questionnaire_responses_public_id_uq',
  });
  await queryInterface.addIndex('questionnaire_responses', ['student_id'], { name: 'questionnaire_responses_student_idx' });
  await queryInterface.addIndex('questionnaire_responses', ['questionnaire_id'], { name: 'questionnaire_responses_questionnaire_idx' });
  await queryInterface.addIndex('questionnaire_responses', ['completed_at'], { name: 'questionnaire_responses_completed_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('questionnaire_responses');
};

