import React, { useEffect, useState } from 'react';
import { getSkills, createSkill, deleteSkill } from '../utils/api';
import { BookOpen, Plus, Trash2, Link as LinkIcon, Menu } from 'lucide-react';

export default function SkillsDetailView({ showToast, panelOpen, setPanelOpen }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState({ name: '', description: '', endpoint: '' });

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const data = await getSkills();
      setSkills(data);
    } catch (error) {
      showToast('Failed to load skills', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createSkill(newSkill);
      showToast('Skill created successfully', 'success');
      setNewSkill({ name: '', description: '', endpoint: '' });
      loadSkills();
    } catch (error) {
      showToast('Failed to create skill', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSkill(id);
      showToast('Skill deleted', 'success');
      loadSkills();
    } catch (error) {
      showToast('Failed to delete skill', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-main overflow-y-auto relative">
      <div className="max-w-[800px] mx-auto w-full pt-[60px] px-6 pb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-bg-card flex items-center justify-center shrink-0 border border-border">
            <BookOpen size={20} className="text-accent" />
          </div>
          <h1 className="text-[24px] font-medium text-text-primary">Skills</h1>
        </div>
        <p className="text-[14px] text-text-secondary mb-8">
          Manage custom capabilities and endpoints for your AI Assistant.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-3">
            {loading ? (
              <div className="text-center py-8 text-text-muted font-mono text-[12px] uppercase tracking-wider animate-pulse">Loading skills...</div>
            ) : skills.length === 0 ? (
              <div className="text-center py-12 bg-bg-card rounded-[12px] border border-border text-text-muted text-[14px]">
                No skills configured yet.
              </div>
            ) : (
              skills.map(skill => (
                <div key={skill.id} className="bg-bg-card border border-border rounded-[12px] p-4 flex items-start justify-between group hover:border-accent transition-colors">
                  <div>
                    <h3 className="font-semibold text-text-primary text-[15px]">{skill.name}</h3>
                    <p className="text-[13px] text-text-secondary mt-1">{skill.description}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-bg-input px-2.5 py-1 rounded-[6px] text-[11px] font-mono text-text-muted border border-border">
                      <LinkIcon size={12} />
                      {skill.endpoint}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(skill.id)}
                    className="p-1.5 text-text-muted hover:text-error rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Skill"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="bg-bg-card border border-border rounded-[12px] p-5 h-fit">
            <h3 className="font-semibold text-text-primary text-[14px] mb-4 flex items-center gap-2">
              <Plus size={16} className="text-accent" />
              Add New Skill
            </h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">Name</label>
                <input 
                  required
                  value={newSkill.name}
                  onChange={e => setNewSkill({...newSkill, name: e.target.value})}
                  className="w-full bg-bg-input border border-border rounded-[8px] px-3 py-2 text-[13px] text-text-primary focus:border-accent outline-none transition-colors placeholder:text-text-muted"
                  placeholder="e.g., Weather API"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">Description</label>
                <textarea 
                  required
                  value={newSkill.description}
                  onChange={e => setNewSkill({...newSkill, description: e.target.value})}
                  className="w-full bg-bg-input border border-border rounded-[8px] px-3 py-2 text-[13px] text-text-primary focus:border-accent outline-none resize-none transition-colors placeholder:text-text-muted"
                  placeholder="What does this skill do?"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">Endpoint URL</label>
                <input 
                  required
                  type="url"
                  value={newSkill.endpoint}
                  onChange={e => setNewSkill({...newSkill, endpoint: e.target.value})}
                  className="w-full bg-bg-input border border-border rounded-[8px] px-3 py-2 text-[13px] text-text-primary focus:border-accent outline-none transition-colors placeholder:text-text-muted"
                  placeholder="https://api.example.com/v1/..."
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-accent text-bg-main font-medium text-[13px] py-2 rounded-[8px] hover:opacity-90 transition-opacity mt-2"
              >
                Add Skill
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
