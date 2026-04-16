import React, { useState } from 'react';
import { Plus, LayoutTemplate, PenTool, LayoutGrid, TerminalSquare, Image as ImageIcon } from 'lucide-react';

const mockArtifacts = [
    { id: 1, title: 'Writing editor', type: 'Word', color: 'bg-green-500/10 text-green-400', icon: PenTool },
    { id: 2, title: 'PRD To Prototype', type: 'Design', color: 'bg-blue-500/10 text-blue-400', icon: LayoutTemplate },
    { id: 3, title: 'Slack Project Insights', type: 'Integration', color: 'bg-purple-500/10 text-purple-400', icon: LayoutGrid },
    { id: 4, title: 'Raw Note Transformer', type: 'Utility', color: 'bg-orange-500/10 text-orange-400', icon: TerminalSquare },
    { id: 5, title: 'Brainstorm Idea Generator', type: 'Creative', color: 'bg-yellow-500/10 text-yellow-400', icon: LayoutGrid },
    { id: 6, title: 'Flashcards', type: 'Education', color: 'bg-cyan-500/10 text-cyan-400', icon: LayoutGrid },
    { id: 7, title: 'Anthropic office simulator', type: 'Game', color: 'bg-pink-500/10 text-pink-400', icon: LayoutGrid },
    { id: 8, title: 'CodeVerter', type: 'Developer', color: 'bg-emerald-500/10 text-emerald-400', icon: TerminalSquare },
    { id: 9, title: 'PyLingo', type: 'Developer', color: 'bg-indigo-500/10 text-indigo-400', icon: TerminalSquare },
];

export default function ArtifactsView() {
    const [activeTab, setActiveTab] = useState('Inspiration');
    const [activePill, setActivePill] = useState('All');

    const pills = ['All', 'Learn something', 'Life hacks', 'Play a game', 'Be creative', 'Touch grass'];

    return (
        <div className="flex flex-col h-full w-full bg-bg-main">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[1000px] mx-auto px-8 pt-12 pb-24 h-full flex flex-col">

                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-serif text-[32px] text-[#e4d9c5] font-normal tracking-wide">Artifacts</h1>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-bg-card hover:bg-bg-hover text-text-primary rounded-md font-medium text-[13px] transition-colors">
                            <Plus size={14} strokeWidth={1.5} />
                            <span>New artifact</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-6 border-b border-border/50 mb-8">
                        {['Inspiration', 'Your artifacts'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 text-[14px] font-medium transition-colors relative ${activeTab === tab ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                                {tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e4d9c5] rounded-t-full" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-10">
                        {pills.map(pill => (
                            <button
                                key={pill}
                                onClick={() => setActivePill(pill)}
                                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${activePill === pill ? 'bg-[#33353b] text-text-primary' : 'bg-transparent text-text-muted hover:bg-[#2a2c31] hover:text-text-secondary'}`}
                            >
                                {pill}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {mockArtifacts.map(art => (
                            <div key={art.id} className="group flex flex-col gap-3 cursor-pointer">
                                <div className={`aspect-[4/3] rounded-xl border border-border/60 flex items-center justify-center p-6 ${art.color} transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]`}>
                                    <art.icon size={48} strokeWidth={1} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[14px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                                    {art.title}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
