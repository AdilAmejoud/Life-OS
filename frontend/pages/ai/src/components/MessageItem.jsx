import React, { useState } from 'react';
import { formatMessage } from '../utils/formatMessage';

export default function MessageItem({ message, retryLast, showToast }) {
  const [thumbUp, setThumbUp] = useState(false);
  const [thumbDown, setThumbDown] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    showToast('Copied to clipboard');
  };

  const handleSave = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([message.content], { type: 'text/plain' }));
    a.download = `message-${message.id}.txt`;
    a.click();
    showToast('Message saved');
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-surface-container-highest' : 'bg-primary text-on-primary'}`}>
        {isUser ? <span className="material-symbols-outlined text-[18px]">person</span> : '✺'}
      </div>
      
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`px-5 py-3 rounded-2xl ${isUser ? 'bg-surface-container-high text-on-surface' : 'bg-transparent text-on-surface'}`}
          dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
        />
        
        {!isUser && (
          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100 px-2">
            <button onClick={handleCopy} className="p-1.5 text-outline hover:text-on-surface rounded hover:bg-surface-container-high" title="Copy">
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            </button>
            <button onClick={() => { setThumbUp(!thumbUp); setThumbDown(false); }} className={`p-1.5 rounded hover:bg-surface-container-high ${thumbUp ? 'text-primary' : 'text-outline hover:text-on-surface'}`} title="Good response">
              <span className="material-symbols-outlined text-[16px]">thumb_up</span>
            </button>
            <button onClick={() => { setThumbDown(!thumbDown); setThumbUp(false); }} className={`p-1.5 rounded hover:bg-surface-container-high ${thumbDown ? 'text-error' : 'text-outline hover:text-on-surface'}`} title="Bad response">
              <span className="material-symbols-outlined text-[16px]">thumb_down</span>
            </button>
            <button onClick={handleSave} className="p-1.5 text-outline hover:text-on-surface rounded hover:bg-surface-container-high" title="Save">
              <span className="material-symbols-outlined text-[16px]">save</span>
            </button>
            <button onClick={retryLast} className="p-1.5 text-outline hover:text-on-surface rounded hover:bg-surface-container-high" title="Regenerate">
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
