const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function buildImageUrl(raw) {
  if (!raw) return '';

  const s = String(raw).trim();
  if (!s) return '';

  // BE trả full URL (rare)
  if (/^https?:\/\//i.test(s)) return s;

  // BE trả dạng /static/...
  if (s.startsWith('/')) {
    return API_BASE_URL.replace(/\/$/, '') + s;
  }

  // fallback: BE trả 'user_avatars/...'
  return API_BASE_URL.replace(/\/$/, '') + '/' + s.replace(/^\/+/, '');
}
