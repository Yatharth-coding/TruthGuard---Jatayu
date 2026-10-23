// Route paths constants for TruthGuard
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  DOCUMENTS: '/documents',
  DOCUMENT_DETAIL: (id = ':id') => `/documents/${id}`,
  CHAT: '/chat',
  CHAT_CONVERSATION: (id = ':id') => `/chat/${id}`,
  SETTINGS: '/settings',
};

export default ROUTES;
