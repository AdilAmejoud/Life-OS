import React from 'react';
import { Menu } from 'lucide-react';

export default function PlaceholderView({ title, panelOpen, setPanelOpen }) {
  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main relative">
      <div className="flex items-center h-14 px-4 border-b border-border shrink-0">
        <h1 className="font-sans text-lg font-medium text-text-primary">{title}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-medium text-text-secondary mb-2">{title}</h2>
          <p className="text-text-muted">This view is under construction.</p>
        </div>
      </div>
    </div>
  );
}
