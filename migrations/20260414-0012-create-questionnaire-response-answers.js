import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'questionnaire_response_answers',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      response_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'questionnaire_responses', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      question_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'questions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      answer_value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      text_answer: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('questionnaire_response_answers', ['public_id'], {
    unique: true,
    name: 'questionnaire_response_answers_public_id_uq',
  });
  await queryInterface.addIndex('questionnaire_response_answers', ['response_id'], { name: 'questionnaire_response_answers_response_idx' });
  await queryInterface.addIndex('questionnaire_response_answers', ['question_id'], { name: 'questionnaire_response_answers_question_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('questionnaire_response_answers');
};

