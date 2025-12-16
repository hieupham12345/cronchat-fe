// src/utils/imageCompress.js
export default async function compressImage(
  file,
  {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.8,
    mimeType = 'image/webp', // đổi sang 'image/jpeg' nếu cần
  } = {}
) {
  if (!(file instanceof File)) return file;
  if (!file.type?.startsWith('image/')) return file;

  // Không nén GIF để tránh mất animation
  if (file.type === 'image/gif') return file;

  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1); // chỉ thu nhỏ, không phóng to
  const targetW = Math.round(width * ratio);
  const targetH = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const blob = await canvasToBlob(canvas, mimeType, quality);

  // nếu blob to hơn file gốc thì thôi, giữ file gốc
  if (!blob || blob.size >= file.size) return file;

  const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
  const newName = renameFile(file.name, ext);

  return new File([blob], newName, { type: mimeType, lastModified: Date.now() });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function renameFile(name, ext) {
  const base = name.replace(/\.[^/.]+$/, '');
  return `${base}.${ext}`;
}
