const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImagePayload({ base64, type, size, maxSizeBytes }) {
  if (!base64 || !type) {
    const err = new Error('Image data is required.');
    err.code = 'INVALID_IMAGE_PAYLOAD';
    throw err;
  }
  if (!ALLOWED_TYPES.includes(type)) {
    const err = new Error('Unsupported image type. Allowed: jpg, png, webp.');
    err.code = 'UNSUPPORTED_IMAGE_TYPE';
    throw err;
  }
  const computedSize = size || Buffer.byteLength(base64, 'base64');
  if (maxSizeBytes && computedSize > maxSizeBytes) {
    const err = new Error('Image size exceeds limit.');
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }
}

export function buildDataUrl(type, base64) {
  if (!type || !base64) return null;
  return `data:${type};base64,${base64}`;
}

export function stripDataUrlPrefix(dataUrl = '') {
  const idx = dataUrl.indexOf('base64,');
  if (idx === -1) return dataUrl;
  return dataUrl.substring(idx + 7);
}

export async function loadImageDataUrl(imageId, ImageModel) {
  if (!imageId || !ImageModel) return null;
  const image = await ImageModel.findOne({ where: { publicId: imageId } });
  if (!image) return null;
  return buildDataUrl(image.imageType, image.imageBase64);
}
