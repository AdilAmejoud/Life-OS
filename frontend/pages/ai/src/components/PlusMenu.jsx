import React, { useState, useEffect, useRef } from 'react';
import { 
  Paperclip, Camera, Folder, Briefcase, Link, 
  Globe, Book, Brain, Palette, ChevronRight, Check, Plus
} from 'lucide-react';

const AttachIcon = () => <Paperclip size={18} strokeWidth={1.75} />
const ScreenshotIcon = () => <Camera size={18} strokeWidth={1.75} />
const FolderIcon = () => <Folder size={18} strokeWidth={1.75} />
const SkillsIcon = () => <Briefcase size={18} strokeWidth={1.75} />
const ConnectorsIcon = () => <Link size={18} strokeWidth={1.75} />
const WebSearchIcon = () => <Globe size={18} strokeWidth={1.75} />
const NotionIcon = () => <Book size={18} strokeWidth={1.75} />
const BrainIcon = () => <Brain size={18} strokeWidth={1.75} />
const StyleIcon = () => <Palette size={18} strokeWidth={1.75} />
const ChevronRightIcon = () => <ChevronRight size={16} strokeWidth={1.75} className="chevron-right" />
const CheckIcon = () => <Check size={16} strokeWidth={1.75} className="check-icon" />

export default function PlusMenu({
  plusMenuOpen, setPlusMenuOpen, plusMenuRef,
  webSearchEnabled, toggleWebSearch,
  notionEnabled, toggleNotion,
  reasoningMode, toggleReasoning,
  attachFile, conversations, projects,
  sidebarPush, setCurrentView
}) {
  return (
    <div className="plus-menu-wrapper" ref={plusMenuRef}>
      <button
        className="plus-btn"
        onClick={() => setPlusMenuOpen(prev => !prev)}
        title="Add content or toggle features"
      >
        <Plus size={24} strokeWidth={1.8} />
      </button>

      {plusMenuOpen && (
        <div className="plus-dropdown">
          <button className="plus-item" onClick={() => { document.getElementById('fileInput').click(); setPlusMenuOpen(false) }}>
            <AttachIcon /> <span>Add files or photos</span>
          </button>
          <button className="plus-item plus-item-disabled">
            <ScreenshotIcon /> <span>Take a screenshot</span>
            <span className="plus-item-soon">Soon</span>
          </button>
          <button className="plus-item plus-item-has-sub">
            <FolderIcon /> <span>Add to project</span>
            <ChevronRightIcon />
          </button>

          <div className="plus-divider" />

          <button className="plus-item plus-item-has-sub"
            onClick={() => { sidebarPush({id:'skills',title:'Skills'}); setCurrentView('skills'); setPlusMenuOpen(false) }}>
            <SkillsIcon /> <span>Skills</span>
            <ChevronRightIcon />
          </button>
          <button className="plus-item plus-item-has-sub"
            onClick={() => { sidebarPush({id:'connectors',title:'Connectors'}); setCurrentView('connectors-detail'); setPlusMenuOpen(false) }}>
            <ConnectorsIcon /> <span>Connectors</span>
            <ChevronRightIcon />
          </button>

          <div className="plus-divider" />

          <button className="plus-item plus-item-toggle" onClick={toggleWebSearch}>
            <WebSearchIcon className={webSearchEnabled ? 'icon-active' : ''} />
            <span>Web search</span>
            {webSearchEnabled && <CheckIcon />}
          </button>
          <button className="plus-item plus-item-toggle" onClick={toggleNotion}>
            <NotionIcon className={notionEnabled ? 'icon-active' : ''} />
            <span>Notion</span>
            {notionEnabled && <CheckIcon />}
          </button>
          <button className="plus-item plus-item-toggle" onClick={toggleReasoning}>
            <BrainIcon className={reasoningMode !== 'none' ? 'icon-active' : ''} />
            <span>Reasoning</span>
            {reasoningMode !== 'none' && (
              <span className="plus-item-mode">{reasoningMode}</span>
            )}
          </button>

          <div className="plus-divider" />

          <button className="plus-item plus-item-disabled plus-item-has-sub">
            <StyleIcon /> <span>Use style</span>
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  )
}
