import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'chat_messages',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      session_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'counseling_sessions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      sender_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      message: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('chat_messages', ['public_id'], { unique: true, name: 'chat_messages_public_id_uq' });
  await queryInterface.addIndex('chat_messages', ['session_id', 'created_at'], { name: 'chat_messages_session_time_idx' });
  await queryInterface.addIndex('chat_messages', ['sender_id'], { name: 'chat_messages_sender_idx' });
  await queryInterface.addIndex('chat_messages', ['session_id', 'is_read'], { name: 'chat_messages_session_read_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('chat_messages');
};

