import React, { useCallback, useRef, useState } from 'react';
import type { List } from './types';

const TEMPLATE_CATEGORIES = [
  'Featured',
  'Productivity Methods',
  'User Setups',
  'Popular',
  'Work',
  'Personal',
  'Education',
  'Board Layout',
  'Calendar Layout',
  'Management',
  'Marketing & Sales',
  'Development',
  'Design & Product',
  'Customer Support',
  'Creative'
];

const POPULAR_TEMPLATES = [
  { id: 'weekly-review', title: 'Weekly Review', description: 'Start reviewing your tasks every week with this GTD-friendly checklist.', tag: 'List' },
  { id: 'project-tracker', title: 'Project Tracker', description: 'A central, organized place to keep track of every step in your project.', tag: 'List' },
  { id: 'meal-planning', title: 'Meal Planning', description: 'Use this template and take the stress out of meal planning and cooking.', tag: 'Calendar' }
];

interface TemplatesModalProps {
  onClose: () => void;
  onImportTasks: (rows: { title: string; listId: string; sectionId?: string | null; dueDate?: string | null }[]) => void;
  lists: List[];
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ onClose, onImportTasks, lists }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('My templates');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setUploadError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please upload a CSV file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setUploadError('CSV must have a header row and at least one data row.');
          return;
        }
        const header = lines[0].toLowerCase().split(',').map((s: string) => s.trim());
        const titleIdx = header.indexOf('title');
        const listIdx = header.indexOf('list') >= 0 ? header.indexOf('list') : header.indexOf('project');
        const sectionIdx = header.indexOf('section');
        const dueIdx = header.indexOf('due') >= 0 ? header.indexOf('due') : header.indexOf('duedate');
        if (titleIdx < 0) {
          setUploadError('CSV must have a "title" column.');
          return;
        }
        const defaultListId = lists[0]?.id ?? 'personal';
        const rows: { title: string; listId: string; sectionId?: string | null; dueDate?: string | null }[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);
          const title = cells[titleIdx]?.trim();
          if (!title) continue;
          let listId = defaultListId;
          if (listIdx >= 0 && cells[listIdx]) {
            const listName = cells[listIdx].trim();
            const list = lists.find(l => l.name.toLowerCase() === listName.toLowerCase());
            if (list) listId = list.id;
          }
          const sectionId = sectionIdx >= 0 && cells[sectionIdx]?.trim() ? cells[sectionIdx].trim() : null;
          const dueDate = dueIdx >= 0 && cells[dueIdx]?.trim() ? normalizeDate(cells[dueIdx].trim()) : null;
          rows.push({ title, listId, sectionId: sectionId || undefined, dueDate });
        }
        if (rows.length === 0) {
          setUploadError('No valid rows found.');
          return;
        }
        onImportTasks(rows);
        onClose();
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Failed to parse CSV.');
      }
    };
    reader.readAsText(file);
  }, [lists, onImportTasks, onClose]);

  function parseCSVLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (inQuotes) {
        cur += c;
      } else if (c === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  }

  function normalizeDate(s: string): string | null {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="templates-modal-backdrop" onClick={onClose}>
      <div className="templates-modal" onClick={e => e.stopPropagation()}>
        <header className="templates-modal-header">
          <h2 className="templates-modal-title">Templates</h2>
          <div className="templates-modal-tabs">
            <span className="templates-modal-tab active">My templates</span>
          </div>
          <input
            type="text"
            className="templates-modal-search"
            placeholder="Search all templates"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button type="button" className="templates-modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="templates-modal-body">
          <aside className="templates-modal-side">
            <div className="templates-modal-cat active">My templates</div>
            <div className="templates-modal-cat-label">Categories</div>
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`templates-modal-cat${selectedCategory === cat ? ' active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </aside>

          <div className="templates-modal-main">
            <section className="templates-start-here">
              <h3 className="templates-section-title">Start here</h3>
              <div className="templates-cards-row">
                <div className="templates-card">
                  <div className="templates-card-icon">?</div>
                  <h4 className="templates-card-title">Learn about templates</h4>
                  <p className="templates-card-desc">Find out more about how to use templates in Todoist.</p>
                  <a href="#" className="templates-card-link" onClick={e => { e.preventDefault(); window.alert('Learn more — Coming soon'); }}>Learn more</a>
                </div>
                <div
                  className={`templates-card templates-card-upload${dragOver ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="templates-file-input"
                    onChange={onFileInputChange}
                    aria-label="Upload CSV template"
                  />
                  <div className="templates-card-icon">↑</div>
                  <h4 className="templates-card-title">Upload template</h4>
                  <p className="templates-card-desc">Drag and drop a CSV file and start importing your template data.</p>
                  {uploadError && <p className="templates-upload-error">{uploadError}</p>}
                </div>
              </div>
            </section>

            <section className="templates-popular">
              <div className="templates-popular-head">
                <h3 className="templates-section-title">Popular templates</h3>
                <button type="button" className="templates-see-all">See all</button>
              </div>
              <p className="templates-popular-desc">Start with our most-used templates for work and life.</p>
              <div className="templates-popular-grid">
                {POPULAR_TEMPLATES.map(t => (
                  <div key={t.id} className="templates-template-card">
                    <div className="templates-template-card-icon">{t.tag === 'List' ? '☰' : '📅'}</div>
                    <h4 className="templates-template-card-title">{t.title}</h4>
                    <p className="templates-template-card-desc">{t.description}</p>
                    <span className="templates-template-card-tag">{t.tag}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
