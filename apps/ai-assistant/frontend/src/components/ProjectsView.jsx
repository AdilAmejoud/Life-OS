import React from 'react';
import { Plus, Search, FolderPlus, ArrowUpDown } from 'lucide-react';

export default function ProjectsView({ panelOpen, setPanelOpen }) {
    return (
        <div className="flex flex-col h-full w-full bg-bg-main">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[800px] mx-auto px-8 pt-12 pb-24 h-full flex flex-col">

                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-serif text-[32px] text-[#e4d9c5] font-normal tracking-wide">Projects</h1>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e4d9c5] text-[#1a1b1e] rounded-md font-medium text-[13px] hover:bg-[#d8ccb8] transition-colors">
                            <Plus size={14} strokeWidth={2} />
                            <span>New project</span>
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" strokeWidth={1.5} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full bg-bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-[14px] text-text-primary placeholder:text-text-muted focus:border-[#e4d9c5]/30 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex justify-end mb-16">
                        <button className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors">
                            <span>Sort by</span>
                            <div className="flex items-center gap-1 bg-bg-card px-2 py-1 rounded border border-border">
                                <span>Activity</span>
                                <ArrowUpDown size={10} />
                            </div>
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80">
                        <div className="w-16 h-16 mb-6 text-text-muted flex items-center justify-center">
                            <FolderPlus size={48} strokeWidth={1} />
                        </div>
                        <h2 className="text-[17px] font-medium text-text-primary mb-2">Looking to start a project?</h2>
                        <p className="text-[14px] text-text-muted max-w-[320px] mb-6 leading-relaxed">
                            Upload materials, set custom instructions, and organize conversations in one space.
                        </p>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#33353b] text-[#e4d9c5] hover:bg-[#33353b] rounded-md font-medium text-[13px] transition-colors">
                            <Plus size={14} strokeWidth={1.5} />
                            <span>New project</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
