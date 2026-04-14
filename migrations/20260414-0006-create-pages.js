import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'pages',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      path: { type: DataTypes.STRING(255), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      excerpt: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      content_html: { type: DataTypes.TEXT('long'), allowNull: true, defaultValue: null },
      blocks: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      is_published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      updated_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('pages', ['public_id'], { unique: true, name: 'pages_public_id_uq' });
  await queryInterface.addIndex('pages', ['path'], { unique: true, name: 'pages_path_uq' });
  await queryInterface.addIndex('pages', ['path'], { name: 'pages_path_idx' });
  await queryInterface.addIndex('pages', ['is_published', 'path'], { name: 'pages_pub_path_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('pages');
};

