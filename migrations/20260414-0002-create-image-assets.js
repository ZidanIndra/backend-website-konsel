import { DataTypes } from 'sequelize';

export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable(
    'image_assets',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      public_id: { type: DataTypes.CHAR(24), allowNull: false },
      owner_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        defaultValue: null,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      purpose: {
        type: DataTypes.ENUM('avatar', 'article_banner', 'article_inline', 'generic'),
        allowNull: false,
        defaultValue: 'generic',
      },
      image_base64: { type: DataTypes.TEXT('long'), allowNull: false },
      image_type: { type: DataTypes.STRING(100), allowNull: false },
      image_size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
  );

  await queryInterface.addIndex('image_assets', ['public_id'], { unique: true, name: 'image_assets_public_id_uq' });
  await queryInterface.addIndex('image_assets', ['owner_id', 'purpose', 'created_at'], {
    name: 'image_assets_owner_purpose_created_idx',
  });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('image_assets');
};

