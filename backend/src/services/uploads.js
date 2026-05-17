const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function parseProductImageUpload(payload) {
  if (!payload || typeof payload !== 'object') return { error: 'Payload invalido.' };
  const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
  const dataUrl = typeof payload.dataUrl === 'string' ? payload.dataUrl.trim() : '';
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) return { error: 'Imagem invalida.' };

  const mimeType = match[1].toLowerCase();
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) return { error: 'Formato de imagem invalido.' };

  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return { error: 'Imagem muito grande.' };

  return {
    value: {
      filename,
      mimeType,
      extension,
      buffer,
    },
  };
}

function saveProductImageUpload(payload, { uploadRoot, publicBasePath = '/uploads/products' }) {
  const parsed = parseProductImageUpload(payload);
  if (parsed.error) {
    const error = new Error(parsed.error);
    error.statusCode = 400;
    throw error;
  }

  const id = crypto.randomBytes(12).toString('hex');
  const filename = `${Date.now()}-${id}${parsed.value.extension}`;
  fs.mkdirSync(uploadRoot, { recursive: true });
  fs.writeFileSync(path.join(uploadRoot, filename), parsed.value.buffer);
  return {
    url: `${publicBasePath}/${filename}`,
    filename,
    mimeType: parsed.value.mimeType,
    size: parsed.value.buffer.length,
  };
}

module.exports = { parseProductImageUpload, saveProductImageUpload };
