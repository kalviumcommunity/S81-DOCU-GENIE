// Single source of truth for the backend base URL. Falls back to a
// hostname-based guess when VITE_API_URL isn't set, so local dev keeps
// working without an .env file.
const isLocalHost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalHost ? 'http://localhost:3001/api' : 'https://s81-docu-genie.onrender.com/api');
