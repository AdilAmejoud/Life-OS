import { useState, useCallback } from 'react';
import { getConversations, getConversation, deleteConversation as apiDeleteConversation } from '../utils/api';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = async (id) => {
    try {
      const data = await getConversation(id);
      return data.messages;
    } catch (error) {
      console.error('Failed to load conversation', error);
      return [];
    }
  };

  const deleteConversation = async (id) => {
    try {
      setConversations(prev => prev.filter(c => c.id !== id));
      await apiDeleteConversation(id);
    } catch (error) {
      console.error('Failed to delete conversation', error);
      loadConversations();
    }
  };

  return {
    conversations,
    loading,
    loadConversations,
    loadConversation,
    deleteConversation,
    refreshConversations: loadConversations
  };
}
