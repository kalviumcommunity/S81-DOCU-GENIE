// Single source of truth for "is the user logged in" as far as the client
// can tell from localStorage alone. Does not validate the JWT itself -
// an expired/invalid token is caught server-side and handled by
// forceLogout() in services/api.js on the next API call.
export const isAuthenticated = () =>
  localStorage.getItem('isAuthenticated') === 'true' && !!localStorage.getItem('token');
