import api from './client';

export const askQuestion = async (question, conversationId) => {
  const response = await api.post('/qa/ask', { question, conversationId });
  return response.data;
};
