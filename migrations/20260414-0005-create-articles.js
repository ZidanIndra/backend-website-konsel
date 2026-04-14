import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'articles',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      slug: { type: DataTypes.STRING(255), allowNull: false },
      content: { type: DataTypes.TEXT('long'), allowNull: false },
      thumbnail: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      thumbnail_image_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: { model: 'image_assets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      category: { type: DataTypes.STRING(100), allowNull: true, defaultValue: 'Kesehatan Mental' },
      author_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      is_published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('articles', ['public_id'], { unique: true, name: 'articles_public_id_uq' });
  await queryInterface.addIndex('articles', ['slug'], { unique: true, name: 'articles_slug_uq' });
  await queryInterface.addIndex('articles', ['category'], { name: 'articles_category_idx' });
  await queryInterface.addIndex('articles', ['author_id'], { name: 'articles_author_idx' });
  await queryInterface.addIndex('articles', ['is_published'], { name: 'articles_published_idx' });
  await queryInterface.addIndex('articles', ['created_at'], { name: 'articles_created_idx' });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('articles');
};

