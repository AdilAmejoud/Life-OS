import React from 'react';

// Upgraded to standard 24x24 viewBox. This natively prevents the fuzzy/muddy anti-aliasing issues 
// on standard 1080p monitors. The SVG scales perfectly to 16px via the width/height prop.
const BaseIcon = ({ size = 16, className = '', children, strokeWidth = 1.5, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {children}
    </svg>
);

export const ClaudePlusCircle = ({ className = '', ...props }) => (
    <svg
        width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className} group`} {...props}
    >
        <circle cx="12" cy="12" r="12" fill="var(--bg-card)" className="transition-colors group-hover:fill-[#4A4A4A]" />
        <path
            d="M12 7v10M7 12h10"
            stroke="#BDBDBD"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="plus-path transition-transform duration-300 origin-center"
        />
    </svg>
);

export const ClaudeSearch = (props) => (
    <BaseIcon {...props}>
        <circle cx="11" cy="11" r="8" className="search-circle transition-transform duration-300 origin-center" />
        <path d="M21 21l-4.35-4.35" className="search-handle transition-transform duration-300 origin-center" />
    </BaseIcon>
);

export const ClaudeCustomize = (props) => (
    <BaseIcon {...props}>
        <rect x="2" y="7" width="20" height="14" rx="2" className="briefcase-body transition-transform duration-300" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" className="briefcase-handle transition-transform duration-300" />
    </BaseIcon>
);

export const ClaudeChat = (props) => (
    <BaseIcon {...props}>
        <path d="M16 10h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1.5l-2.5 2v-2" className="chat-bubble-back transition-transform duration-300 origin-top-right" />
        <path d="M4 14a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5.5L3 16v-2H4" />
    </BaseIcon>
);

export const ClaudeProjects = (props) => (
    <BaseIcon {...props}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" className="project-lid transition-transform duration-300 origin-center" />
        <path d="M2 12l10 5 10-5" className="project-drawer transition-transform duration-300 origin-center" />
        <path d="M2 17l10 5 10-5" className="project-drawer transition-transform duration-300 origin-center" />
    </BaseIcon>
);

export const ClaudeArtifacts = (props) => (
    <BaseIcon {...props}>
        <path d="M9 3L11.5 6L9 9L6.5 6L9 3Z" className="art-diamond transition-transform duration-300" />
        <path d="M15 3h4v4m0-4L15 7m4 0h-4V3" className="art-x transition-transform duration-300" />
        <path d="M9 15c0 2-2 3-2 3 0 0 2 1 2 3 0-2 2-3 2-3 0 0-2-1-2-3z" className="art-sparkle transition-transform duration-300" />
        <circle cx="17" cy="17" r="2.5" className="art-circle transition-transform duration-300" />
    </BaseIcon>
);

export const ClaudeCode = (props) => (
    <BaseIcon {...props}>
        <path d="M8 6L2 12l6 6" className="code-left transition-transform duration-300" />
        <path d="M16 6l6 6-6 6" className="code-right transition-transform duration-300" />
        <path d="M14 4l-4 16" className="code-slash transition-transform duration-300 origin-center" />
    </BaseIcon>
);

export const ClaudeSidebarLeft = (props) => (
    <BaseIcon {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" className="sidebar-split transition-transform duration-300" />
    </BaseIcon>
);

export const ClaudeArrowLeft = (props) => (
    <BaseIcon {...props}>
        <path d="M19 12H5M12 19l-7-7 7-7" className="arrow-path transition-transform duration-300" />
    </BaseIcon>
);

export const ClaudeX = (props) => (
    <BaseIcon {...props}>
        <path d="M18 6L6 18M6 6l12 12" className="transition-transform duration-300 group-hover:rotate-90 origin-center" />
    </BaseIcon>
);

export const ClaudeTrash = (props) => (
    <BaseIcon {...props}>
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-5 5v6m4-6v6" className="trash-lid transition-transform duration-300 origin-bottom" />
        <path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" />
    </BaseIcon>
);

export const ClaudeDownload = (props) => (
    <BaseIcon {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" className="download-arrow transition-transform duration-300 origin-center" />
    </BaseIcon>
);

export const ClaudeSelector = (props) => (
    <BaseIcon {...props}>
        <path d="M7 15l5 5 5-5M7 9l5-5 5 5" className="selector-arrows transition-transform duration-300 origin-center" />
    </BaseIcon>
);
