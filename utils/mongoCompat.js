export function toMongoDoc(model) {
  if (!model) return null;
  const plain = typeof model.get === 'function' ? model.get({ plain: true }) : model;
  const publicId = plain.publicId ?? plain.public_id ?? null;

  const doc = { ...plain };
  delete doc.id; // numeric PK
  delete doc.publicId;

  if (publicId) {
    doc._id = publicId;
    doc.id = publicId;
  }

  return doc;
}

// Lean-ish output: contains `_id` but does NOT include the duplicated `id` alias.
export function toMongoLeanDoc(model) {
  if (!model) return null;
  const plain = typeof model.get === 'function' ? model.get({ plain: true }) : model;
  const publicId = plain.publicId ?? plain.public_id ?? null;

  const doc = { ...plain };
  delete doc.id;
  delete doc.publicId;

  if (publicId) {
    doc._id = publicId;
  }

  return doc;
}
