import { useState, useCallback } from 'react';
import { getTasks, createTask, updateTask, deleteTask as apiDeleteTask } from '../utils/api';

export function useTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadTasks = useCallback(async (status = '') => {
        setLoading(true);
        try {
            const data = await getTasks(status);
            setTasks(Array.isArray(data) ? data : (data.tasks || []));
        } catch (e) {
            console.error('Failed to load tasks', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const addTask = async (body) => {
        const data = await createTask(body);
        setTasks(prev => [data, ...prev]);
        return data;
    };

    const toggleTask = async (id, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        try {
            await updateTask(id, { status: newStatus });
        } catch (e) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t));
        }
    };

    const removeTask = async (id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        try { await apiDeleteTask(id); } catch (e) {
            console.error('Failed to delete task', e);
        }
    };

    return { tasks, loading, loadTasks, addTask, toggleTask, removeTask };
}
