import { useState, useCallback } from 'react';
import { getModels, getHealth, switchModel as apiSwitchModel } from '../utils/api';

export function useModels() {
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      const data = await getModels();
      setModels(data.models || []);
      if (data.current) setCurrentModel(data.current);
    } catch (error) {
      console.error('Failed to fetch models', error);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await getHealth();
      setCurrentModel(data.model);
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
    }
  }, []);

  const switchModel = async (name) => {
    try {
      await apiSwitchModel(name);
      setCurrentModel(name);
      setDropdownOpen(false);
    } catch (error) {
      console.error('Failed to switch model', error);
    }
  };

  const toggleDropdown = () => setDropdownOpen(p => !p);
  const closeDropdown = () => setDropdownOpen(false);

  return {
    models, currentModel, isOnline, dropdownOpen,
    fetchModels, fetchHealth, switchModel, toggleDropdown, closeDropdown
  };
}
