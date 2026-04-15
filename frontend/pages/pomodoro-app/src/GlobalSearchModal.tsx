import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import './GlobalSearchModal.css';

interface Bang {
    shortcut: string;
    url: string;
}

const BANGS: Bang[] = [
    { shortcut: '!gh', url: 'https://github.com/search?q={QUERY}' },
    { shortcut: '!dh', url: 'https://hub.docker.com/search?q={QUERY}' },
    { shortcut: '!so', url: 'https://stackoverflow.com/search?q={QUERY}' },
    { shortcut: '!mdn', url: 'https://developer.mozilla.org/en-US/search?q={QUERY}' },
    { shortcut: '!aws', url: 'https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation&searchQuery={QUERY}' },
    { shortcut: '!yt', url: 'https://www.youtube.com/results?search_query={QUERY}' }
];

export const GlobalSearchModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            const isInputFocused =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            if (e.key === 's' && !isInputFocused) {
                e.preventDefault();
                setIsOpen(true);
            }

            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        let searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

        // Check for bangs
        const parts = query.trim().split(' ');
        const potentialBang = parts[0];

        const bangMatch = BANGS.find(b => b.shortcut === potentialBang);
        if (bangMatch) {
            const remainingQuery = parts.slice(1).join(' ');
            searchUrl = bangMatch.url.replace('{QUERY}', encodeURIComponent(remainingQuery));
        }

        // Open search in same tab just like Glance or new tab, we'll use same tab here to act as portal
        window.location.href = searchUrl;

        setIsOpen(false);
        setQuery('');
    };

    if (!isOpen) return null;

    return (
        <div className="global-search-backdrop" onClick={() => setIsOpen(false)}>
            <div
                className="global-search-modal"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSearch} className="global-search-form">
                    <Search className="global-search-icon" size={24} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="global-search-input"
                        placeholder="Search or type a command (e.g. !gh react)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </form>
                <div className="global-search-hint">
                    <span className="key-hint">esc</span> to close &bull; <span className="key-hint">enter</span> to search
                </div>
            </div>
        </div>
    );
};
