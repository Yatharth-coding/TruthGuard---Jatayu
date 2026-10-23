import api from './client';

export const getConversations = async (params = {}) => {
  const response = await api.get('/conversations', { params });
  return response.data;
};

export const getConversation = async (id) => {
  const response = await api.get(`/conversations/${id}`);
  return response.data;
};

export const createConversation = async (title) => {
  const response = await api.post('/conversations', { title });
  return response.data;
};

export const deleteConversation = async (id) => {
  const response = await api.delete(`/conversations/${id}`);
  return response.data;
};
