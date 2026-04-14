import crypto from 'crypto';

// Generate a 24-hex public id (12 bytes => 24 hex chars).
// Stored in MySQL as `public_id` for stable external identifiers.
export function generatePublicId() {
  const time = Math.floor(Date.now() / 1000);
  const timeBuf = Buffer.allocUnsafe(4);
  timeBuf.writeUInt32BE(time, 0);
  const randBuf = crypto.randomBytes(8);
  return Buffer.concat([timeBuf, randBuf]).toString('hex');
}

export function isPublicId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}
