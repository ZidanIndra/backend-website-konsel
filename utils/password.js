import bcryptjs from 'bcryptjs';

// ============================================================
// Password Helpers (bcryptjs with Promise API)
// ============================================================

export function hashPassword(plainText, rounds = 10) {
  return new Promise((resolve, reject) => {
    bcryptjs.hash(plainText, rounds, (err, hash) => {
      if (err) return reject(err);
      resolve(hash);
    });
  });
}

export function comparePassword(plainText, hash) {
  return new Promise((resolve, reject) => {
    bcryptjs.compare(plainText, hash, (err, same) => {
      if (err) return reject(err);
      resolve(same);
    });
  });
}
