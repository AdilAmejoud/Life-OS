import React from 'react';
import { 
  MoreHorizontal, 
  Plus, 
  MessageSquare, 
  Paperclip, 
  Clock, 
  Calendar,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { motion } from 'motion/react';

interface Task {
  id: string;
  title: string;
  description?: string;
  tag: string;
  tagColor: string;
  assignees: string[];
  comments?: number;
  attachments?: number;
  dueDate?: string;
  progress?: { current: number; total: number };
  image?: string;
  priority?: boolean;
}

interface ColumnProps {
  title: string;
  count: number;
  color: string;
  tasks: Task[];
}

const KanbanCard: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-brand-card p-4 rounded-2xl border border-white/10 shadow-sm hover:shadow-md hover:border-brand-accent/50 transition-all group cursor-grab active:cursor-grabbing"
    >
      {task.image && (
        <div className="w-full h-32 rounded-xl bg-brand-bg mb-4 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 to-brand-bg"></div>
          <div className="w-full h-full flex items-center justify-center opacity-30">
            <TerminalIcon className="w-12 h-12 text-brand-accent" />
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${task.tagColor}`}>
          {task.tag}
        </span>
        <button className="text-brand-muted group-hover:text-brand-text transition-colors">
          <Edit3 size={16} />
        </button>
      </div>

      <h4 className="text-sm font-bold text-brand-text leading-snug group-hover:text-brand-accent transition-colors">
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-xs text-brand-muted mt-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex -space-x-2">
          {task.assignees.map((url, i) => (
            <img 
              key={i}
              src={url} 
              alt="Assignee" 
              className="w-6 h-6 rounded-full border-2 border-brand-card shadow-sm"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>

        <div className="flex items-center gap-3 text-brand-muted">
          {task.comments !== undefined && (
            <div className="flex items-center gap-1 text-[10px] font-medium">
              <MessageSquare size={12} /> {task.comments}
            </div>
          )}
          {task.attachments !== undefined && (
            <div className="flex items-center gap-1 text-[10px] font-medium">
              <Paperclip size={12} /> {task.attachments}
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-brand-accent font-bold text-[10px]">
              <Clock size={12} /> {task.dueDate}
            </div>
          )}
          {task.priority && (
             <div className="flex items-center gap-1 text-[10px] text-brand-muted font-medium">
              <Calendar size={12} /> Aug 24
            </div>
          )}
          {task.progress && (
            <div className="bg-white/5 px-2 py-1 rounded-lg flex items-center gap-1 border border-white/5">
              <CheckCircle2 size={12} className="text-brand-accent" />
              <span className="text-[10px] font-bold text-brand-muted">{task.progress.current}/{task.progress.total} Tasks</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TerminalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const KanbanColumn: React.FC<ColumnProps> = ({ title, count, color, tasks }) => {
  return (
    <div className="w-80 flex flex-col gap-4 flex-shrink-0">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
          <h3 className="font-bold text-brand-text uppercase text-xs tracking-widest">{title}</h3>
          <span className="bg-white/10 text-brand-muted text-[10px] px-2 py-0.5 rounded-full font-bold">{count}</span>
        </div>
        <button className="text-brand-muted hover:text-brand-text transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3 h-full">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))
        ) : (
          <div className="flex-1 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center p-8 text-center bg-white/5">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 size={32} className="text-white/10" />
              <p className="text-xs text-brand-muted font-medium italic">No tasks completed yet. Keep pushing!</p>
            </div>
          </div>
        )}
      </div>

      <button className="mt-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-white/10 rounded-2xl text-brand-muted hover:border-brand-accent hover:text-brand-text hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider group">
        <Plus size={18} className="group-hover:scale-110 transition-transform" /> 
        Add card
      </button>
    </div>
  );
};

export const KanbanBoard = () => {
  const data: ColumnProps[] = [
    {
      title: 'Research',
      count: 4,
      color: 'bg-brand-accent',
      tasks: [
        {
          id: '1',
          title: 'Kubernetes Cluster Setup',
          description: 'Research cloud provider options for EKS, GKE, and AKS clusters.',
          tag: 'High Priority',
          tagColor: 'bg-brand-accent/20 text-brand-accent',
          assignees: [
            'https://lh3.googleusercontent.com/aida-public/AB6AXuAn7qy-XQaZe0TKxmbWdEi9rGOgloYLziAOw801xpFHPhsX57gnKMihePY9j_86W6-MS105dGHLpsOeXUPHK_OlRxItTACe3nU2OxrLaT0cDw5l7sqYQcJr_cLZ-HTVI8aGRGJzYkYAdVSIaJ0ZxfZU6izDQ1ec_i7Ol6mefxD40GaypQfn3HK4svAkxJ6OOtlb37ylfSMhzzQdmgE3mXsd_Gx3pLjhflRsUkWMLNPXQ6TOzI6yfsRv-__E-wK3_KWmmbtvkffR',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB12gu6ujDTqmN9LMuIYdbyQinquR57f6qlc-VRQJ5Cbw4pZdsdaZaLzQQmzQrmlVW8PuYW7u95K6dJzVkNLQ8GWMuVLALQeUcwQUSUI1yYXvZ3jqFBBO9w4OluzwqqZ23LElQDDjOSdG4_uQ2ieoZ9ZO52OaSwbHQmYNKufuuon1QcXn37Omc3C5MCDxntt1PvS0OiGyjog6C1ihWAoz4UDU1ZD_kFFSh3Pp0OVjcgxz6MLmxWhW9J_uSHyroOkmcgCWFceIB7'
          ],
          comments: 4,
          attachments: 2,
          image: 'terminal'
        },
        {
          id: '2',
          title: 'Docker Security Best Practices',
          description: 'Review official documentation for multi-stage builds and user permissions.',
          tag: 'Analysis',
          tagColor: 'bg-brand-accent/20 text-brand-accent',
          assignees: ['https://lh3.googleusercontent.com/aida-public/AB6AXuCwtNw_Iu9Ds76eTNxaUADZurYLRlFKG6Xj_p8Z5FnitJDVvef8mLKfs7rcd12M94Xvdo8O9WnpSMhpzlZcW88oKIbQwLfE1pGkbIYomrO5T3HglwEWw6sZHDCHa-g__nsF0sfj-NcK4Pk5FJcZrQv9agcJLonIj3n5IrACyOBI6vyyeGGLUUOL7qPcKvhFBdwq1Edhjv3jnCMa-IXqpNNB40PT-RdH9rSUzmKd0d5XKRHFK7zf0HJBS3-GY19fn3APc3ODryf6'],
          dueDate: '2 days left'
        }
      ]
    },
    {
      title: 'Practice',
      count: 2,
      color: 'bg-brand-accent',
      tasks: [
        {
          id: '3',
          title: 'Ansible Playbook Creation',
          description: 'Write a playbook to automate Nginx installation on Ubuntu.',
          tag: 'Learning',
          tagColor: 'bg-brand-green/20 text-brand-green',
          assignees: ['https://lh3.googleusercontent.com/aida-public/AB6AXuCg-kGuDF1XlD0MvJip5iH1RAz7c3e35IpMzT_6hxDafdLHLipawbWWu39eYp8u-PIUZafEkROoO8juAL0vwVgqL1hR3RTWSSM68FEHlTichMppW3YajZercWTsoc8DeYF2SJioRg-qpphK_IqDpFZnBrsFpFSkF7zNCESKgToT4WrupkIhePq0OyyAU4sUREQYurwz5vzqmTiCrPpJFYUJapQgKd6q7p639Y9a2mQnQ2e6r1TvV0-0Zfvbmg1aBZe_WJ2HRk1y'],
        }
      ]
    },
    {
      title: 'Projects',
      count: 1,
      color: 'bg-brand-accent',
      tasks: [
        {
          id: '4',
          title: 'CI/CD Pipeline Design',
          description: 'Build a Jenkins pipeline with GitHub integration for auto-deployment.',
          tag: 'In Progress',
          tagColor: 'bg-brand-accent/20 text-brand-accent',
          assignees: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBEMnBwKYf_qiHgEO92GYVvJBjCcB_TFfso5IOm-UKtripY9ZmBdBAQd-2Nfa1-E40kKT-wg3sHmOZ3KFIYvwrdZeiTeGF2s3GHlxd3GL-UjI1JVwvAMx4GJvEN3j1yeCcDxAxoKEwj4ovyH7_rrVyMQz082PL5rrgwSo6sh-zJHZMQQ3PusBzxL_ybcrxRli5Uj0jKSeuiwZY-vQG5lvM-60Wg-HHm02IRM7W5ObofQhjtksu_eIeDI9wheb1kRiuu_fCg6S0c'],
          progress: { current: 65, total: 100 }
        }
      ]
    },
    {
      title: 'Done',
      count: 0,
      color: 'bg-brand-muted',
      tasks: []
    }
  ];

  return (
    <div className="flex-1 overflow-x-auto p-6 bg-brand-surface">
      <div className="flex h-full gap-6 min-w-max">
        {data.map((col) => (
          <KanbanColumn 
            key={col.title} 
            title={col.title}
            count={col.count}
            color={col.color}
            tasks={col.tasks}
          />
        ))}
      </div>
    </div>
  );
};
