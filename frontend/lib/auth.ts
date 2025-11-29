export const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

