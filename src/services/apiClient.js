// src/services/apiClient.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path, options = {}) {
  const url = API_BASE_URL + path;

  const { body } = options;

  // bắt đầu từ headers mà caller truyền vào
  const headers = {
    ...(options.headers || {}),
  };

  // check xem caller có tự set Content-Type chưa
  const hasContentType = Object.keys(headers).some(
    (k) => k.toLowerCase() === 'content-type'
  );

  // nếu caller KHÔNG set Content-Type thì mình mới set
  if (!hasContentType) {
    // ❗ chỉ set application/json khi body KHÔNG phải FormData
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    // còn nếu là FormData → KHÔNG đụng tới Content-Type
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}
