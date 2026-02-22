import base44 from './base44Client';

export const auth = {
  login: (email, password) => base44.auth.loginViaEmailPassword(email, password),
  register: (payload) => base44.auth.register(payload),
  logout: (redirectUrl) => base44.auth.logout(redirectUrl),
  me: () => base44.auth.me(),
};

export default auth;
