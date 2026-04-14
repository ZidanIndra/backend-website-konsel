export const up = async ({ context: queryInterface }) => {
  await queryInterface.addConstraint('users', {
    fields: ['avatar_image_id'],
    type: 'foreign key',
    name: 'users_avatar_image_id_fk',
    references: { table: 'image_assets', field: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.removeConstraint('users', 'users_avatar_image_id_fk');
};

