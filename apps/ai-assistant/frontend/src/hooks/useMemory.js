import { useState, useCallback } from 'react';
import { getMemory, storeMemory, getUserData, storeUserData } from '../utils/api';

export function useMemory() {
    const [memories, setMemories] = useState([]);
    const [userData, setUserData] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadMemory = useCallback(async () => {
        setLoading(true);
        try {
            const [memData, udData] = await Promise.allSettled([getMemory(), getUserData()]);
            if (memData.status === 'fulfilled') {
                const d = memData.value;
                setMemories(Array.isArray(d) ? d : (d.memories || []));
            }
            if (udData.status === 'fulfilled') {
                const d = udData.value;
                setUserData(Array.isArray(d) ? d : (d.data || []));
            }
        } catch (e) {
            console.error('Failed to load memory', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const addMemory = async (body) => {
        const data = await storeMemory(body);
        setMemories(prev => [data, ...prev]);
        return data;
    };

    const addUserData = async (body) => {
        const data = await storeUserData(body);
        setUserData(prev => [data, ...prev]);
        return data;
    };

    return { memories, userData, loading, loadMemory, addMemory, addUserData };
}
