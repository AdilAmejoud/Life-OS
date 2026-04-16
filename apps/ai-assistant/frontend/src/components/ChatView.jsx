import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, PanelLeftOpen, User, Sparkles, Code, GraduationCap, Pencil, Coffee, Lightbulb, X, Share } from 'lucide-react';
import InputArea from './InputArea';
import AnimatedOrb from './AnimatedOrb';
import { ClaudeSidebarLeft } from './ClaudeIcons';

// ─── Chat Top Bar ─────────────────────────────────────────────────────────────
function ChatTopBar({ panelOpen, setPanelOpen, currentConversationId, conversations }) {
  const currentChat = conversations?.find(c => c.id === currentConversationId);
  const [menuOpen, setMenuOpen] = useState(false);
  const title = currentChat ? currentChat.title : 'New Chat';

  return (
    <div className="flex items-center justify-between px-3 h-[52px] shrink-0 w-full bg-bg-main relative z-20">
      <div className="flex items-center gap-1">
        {!panelOpen && (
          <button onClick={() => setPanelOpen(true)}
            className="group relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
            title="Expand sidebar">
            <ClaudeSidebarLeft size={16} className="shrink-0 group-hover:scale-105 transition-transform duration-200" />
          </button>
        )}

        {/* Chat Title with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-bg-hover text-text-primary transition-colors font-sans text-[14px] font-medium max-w-[400px]"
          >
            <span className="truncate">{title}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>

          {menuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
              <div className="absolute top-full left-0 mt-1 w-[220px] bg-bg-card border border-border shadow-lg rounded-xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200" onClick={() => setMenuOpen(false)}>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg-hover"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Star</button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg-hover"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Rename</button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] text-text-secondary hover:text-text-primary hover:bg-bg-hover"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Add to project</button>
                <div className="h-px bg-border/50 my-1 mx-2"></div>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] text-[#ffb4ab] hover:bg-bg-hover"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side Share button */}
      <div className="flex items-center pr-2">
        {currentConversationId && currentConversationId !== 'new' && (
          <button className="px-3 py-1.5 rounded-md border border-border bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors font-sans text-[12px] font-medium flex items-center gap-1.5">
            <Share size={12} strokeWidth={2} /> Share
          </button>
        )}
      </div>
    </div>
  );
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// ─── Welcome Screen ────────────────────────────────────────────────────────────
function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center w-full animate-in fade-in zoom-in-95 duration-1000">
      {/* The glowing NEXUS ASCII Art - Centered and larger */}
      <div className="relative mb-12 flex justify-center w-full group animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-backwards">
        <pre className="nexus-glowing-ascii text-center select-none relative z-10 transition-transform duration-700 hover:scale-[1.03] text-[14px] md:text-[16px] leading-[1.1] font-mono font-bold">{`███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`}</pre>
        {/* Ambient glow behind it */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/15 blur-[120px] rounded-[100%] pointer-events-none group-hover:bg-accent/25 transition-all duration-1000" />
      </div>

      <div className="font-serif text-[38px] md:text-[42px] font-normal leading-tight text-[#e4d9c5] flex gap-4 items-center justify-center mb-10 w-full animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 fill-mode-backwards tracking-tight">
        <Sparkles className="text-[#db745c] opacity-90" size={32} strokeWidth={1.2} />
        <span className="italic opacity-95">{getGreeting()}, Adil</span>
      </div>
    </div>
  );
}

// ─── Suggestion Pills ────────────────────────────────────────────────────────
const SKILL_CATEGORIES = [
  {
    id: 'code', label: 'Code', icon: Code,
    prompts: [
      { display: 'Create code snippets', text: 'Hi Claude! Could you create some code snippets for a new project? If you need more details, ask me right away.' },
      { display: 'Plan a development roadmap', text: 'Hi Claude! Could you help me plan a technical development roadmap? I can provide the project scope.' },
      { display: 'Look over my code and give me tips', text: 'Hi Claude! I have some code I would like you to review and give me tips on optimization and best practices.' },
      { display: 'Develop code reviews to speed me up', text: 'Hi Claude! Help me develop an automated code review checklist to speed up my workflows.' },
      { display: 'Create technical diagrams', text: 'Hi Claude! Help me trace out a technical architecture diagram for a system I am designing.' }
    ]
  },
  {
    id: 'learn', label: 'Learn', icon: GraduationCap,
    prompts: [
      { display: 'Find the best books on a subject', text: 'Hi Claude! Could you find the best books on a subject? If you need more information from me, ask me 1-2 key questions right away. If you think I should give you more context, just ask!' },
      { display: 'Create a knowledge map that reveals surprising patterns', text: 'Hi Claude! Help me create a knowledge map linking different disciplines to reveal surprising patterns in what I know.' },
      { display: 'Create assessment questions', text: 'Hi Claude! Generate some rigorous assessment questions to test my understanding of a complex topic.' },
      { display: 'Create study summaries', text: 'Hi Claude! Could you create concise study summaries from raw lecture notes?' },
      { display: 'Design research questions', text: 'Hi Claude! Help me design deep, exploratory research questions for my next paper.' }
    ]
  },
  {
    id: 'write', label: 'Write', icon: Pencil,
    prompts: [
      { display: 'Draft a professional email', text: 'Hi Claude! I need to draft a delicate but firm professional email. Help me strike the right tone.' },
      { display: 'Write a creative story', text: 'Hi Claude! Help me brainstorm and write an engaging creative story.' },
      { display: 'Summarize a long document', text: 'Hi Claude! I will paste a long document here, and I need you to summarize the key actionable takeaways.' },
      { display: 'Help me outline an essay', text: 'Hi Claude! I am writing an essay. Help me structure the outline logically.' }
    ]
  },
  {
    id: 'life', label: 'Life stuff', icon: Coffee,
    prompts: [
      { display: 'Plan a weekly meal schedule', text: 'Hi Claude! Help me plan a weekly meal schedule optimizing for high protein and quick prep times.' },
      { display: 'Create a workout routine', text: 'Hi Claude! Design a comprehensive 4-day workout split for me.' },
      { display: 'Draft a travel itinerary', text: 'Hi Claude! I am planning a trip. Help me draft a day-by-day travel itinerary.' }
    ]
  },
  {
    id: 'claude', label: "Claude's choice", icon: Lightbulb,
    prompts: [
      { display: 'Surprise me with a random fact', text: 'Hi Claude! Tell me a highly obscure, fascinating historical fact.' },
      { display: 'Give me a creative thinking exercise', text: 'Hi Claude! Walk me through a creative thinking exercise to break my mental block.' },
      { display: 'Recommend a new hobby to try', text: 'Hi Claude! I need a new hobby that is both tactile and analytical. What do you recommend?' }
    ]
  }
];

function SuggestionPills({ setInput }) {
  const [activeCategory, setActiveCategory] = useState(null);

  if (activeCategory) {
    const category = SKILL_CATEGORIES.find(c => c.id === activeCategory);
    const Icon = category.icon;
    return (
      <div className="w-full mt-4 bg-bg-card border border-border/60 rounded-[14px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2 text-text-muted">
            <Icon size={14} strokeWidth={1.5} />
            <span className="font-sans text-[13px] font-medium">{category.label}</span>
          </div>
          <button onClick={() => setActiveCategory(null)} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex flex-col py-1">
          {category.prompts.map((prompt, i) => (
            <button key={i} onClick={() => { setInput(prompt.text); setActiveCategory(null); }}
              className="flex items-center justify-between w-full px-4 py-3 text-left text-[14px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors border-b border-border/20 last:border-b-0">
              <span className="truncate pr-4">{prompt.display}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-backwards">
      {SKILL_CATEGORIES.map(cat => {
        const Icon = cat.icon;
        return (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border/60 bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
            <Icon size={14} strokeWidth={1.5} className="text-text-muted opacity-80" />
            <span className="text-[13px] font-medium">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Code block with copy ──────────────────────────────────────────────────────
function CodeBlock({ language, children, showToast }) {
  const code = String(children).replace(/\n$/, '');
  return (
    <div className="bg-bg-rail rounded-lg overflow-hidden my-4 border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-card border-b border-border">
        <span className="font-mono text-[10px] text-text-muted uppercase">{language || 'code'}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); showToast('Copied!', 'success'); }}
          className="text-[10px] font-mono text-text-muted hover:text-text-primary flex items-center gap-1">
          <Copy size={11} /> COPY
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto">
        <code className="font-mono text-[12px] text-text-primary whitespace-pre">{code}</code>
      </div>
    </div>
  );
}

// ─── Message Item ──────────────────────────────────────────────────────────────
function MessageItem({ msg, showToast, onRetry, isStreamingTarget }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end mb-5' : 'justify-start mb-7'}`}>
      <div className={`flex max-w-[88%] md:max-w-[80%] gap-3 ${isUser ? 'flex-row-reverse user-message-enter' : 'flex-row animate-in fade-in zoom-in-95 duration-300'}`}>

        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-[2px] ${isUser ? 'bg-bg-hover border border-border' : ''}`}>
          {isUser ? <User className="w-4 h-4 text-text-secondary" /> : <AnimatedOrb className="w-8 h-8 shrink-0" size={32} />}
        </div>

        {/* Label + Bubble + Actions */}
        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          <span className={`msg-role-label ${isUser ? 'you-label' : 'nexus-label'}`}>
            {isUser ? 'You' : 'NEXUS'}
          </span>

          {isUser ? (
            <div className="user-bubble">{msg.content}</div>
          ) : (
            <div className={`claude-prose w-full ${isStreamingTarget ? 'opacity-90' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match
                      ? <CodeBlock language={match[1]} showToast={showToast}>{children}</CodeBlock>
                      : <code {...props}>{children}</code>;
                  },
                  a({ href, children }) {
                    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}

          {!isUser && (
            <div className="message-actions">
              <button className="msg-action-btn" onClick={() => { navigator.clipboard.writeText(msg.content); showToast('Copied!', 'success'); }} title="Copy">
                <Copy size={13} strokeWidth={1.5} />
                <span>Copy</span>
              </button>
              <button className="msg-action-btn" onClick={() => showToast('Feedback recorded')} title="Good response">
                <ThumbsUp size={13} strokeWidth={1.5} />
              </button>
              <button className="msg-action-btn" onClick={() => showToast('Feedback recorded')} title="Bad response">
                <ThumbsDown size={13} strokeWidth={1.5} />
              </button>
              <button
                className="msg-action-btn"
                title="Save"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(new Blob([msg.content], { type: 'text/plain' }));
                  a.download = 'message.txt';
                  a.click();
                  showToast('Saved');
                }}
              >
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Save</span>
              </button>
              {onRetry && (
                <>
                  <div className="msg-action-divider" />
                  <button className="msg-action-btn" onClick={onRetry} title="Regenerate">
                    <RefreshCw size={13} strokeWidth={1.5} />
                    <span>Retry</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Thinking Indicator ──────────────────────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex w-full justify-start mb-7 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex max-w-[80%] gap-3 flex-row">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-[2px]">
          <AnimatedOrb className="w-8 h-8 shrink-0" size={32} />
        </div>
        <div className="flex flex-col min-w-0 items-start">
          <span className="msg-role-label nexus-label">NEXUS</span>
          <div className="flex gap-1.5 items-center px-2 py-3 mt-1">
            <span className="w-2 h-2 rounded-full bg-text-muted/50 animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 rounded-full bg-text-muted/50 animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 rounded-full bg-text-muted/50 animate-bounce"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Progress Card ────────────────────────────────────────────────────────
const TOOL_ICONS = {
  web_search:     '🔍',
  weather:        '🌤',
  calculator:     '🧮',
  fileSystem:     '📂',
  file_ops:       '📂',
  github:         '🐙',
  gmail:          '📧',
  gcal:           '📅',
  notion:         '📄',
  url_fetch:      '🌐',
  code_execution: '💻',
};

function ToolProgressCard({ steps }) {
  const [expanded, setExpanded] = useState({});
  if (!steps || steps.length === 0) return null;

  // Deduplicate by name — keep last entry per tool name
  const seen = new Set();
  const deduped = [...steps].reverse().filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  }).reverse();

  return (
    <div className="flex gap-3 max-w-[90%] md:max-w-[85%] mr-auto mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="shrink-0 w-8 h-8" />
      <div className="flex flex-col gap-1.5 w-full">
        {deduped.map((step, i) => {
          const done = step.result !== undefined;
          const icon = TOOL_ICONS[step.name] || '🔧';
          const isOpen = expanded[i];
          const label = step.name.replace(/_/g, ' ');
          const ok = !done || step.result?.ok !== false && step.result?.success !== false;

          return (
            <button
              key={i}
              onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
              className="text-left w-full px-3 py-2 rounded-xl border border-border/60 bg-bg-card/60 backdrop-blur-sm flex flex-col gap-1.5 hover:bg-bg-card transition-colors"
              style={{ boxShadow: 'rgba(0,0,0,.08) 0 2px 8px -2px' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] leading-none">{icon}</span>
                {!done ? (
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                ) : ok ? (
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500/80">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-rose-500/80">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2L6 6M6 2L2 6" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  </span>
                )}
                <span className="text-[12px] text-text-secondary font-medium capitalize">{label}</span>
                {done && (
                  <span className="ml-auto text-[10px] text-text-muted">{isOpen ? '▲' : '▼'}</span>
                )}
              </div>

              {/* Args row */}
              {step.args && Object.keys(step.args).length > 0 && (
                <div className="text-[11px] text-text-muted font-mono pl-5 truncate">
                  {Object.entries(step.args).map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`).join(' · ')}
                </div>
              )}

              {/* Result (expandable) */}
              {isOpen && done && step.result && (
                <pre className="mt-1 pl-5 text-[11px] text-text-muted font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                  {JSON.stringify(step.result, null, 2)}
                </pre>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ChatView ─────────────────────────────────────────────────────────────────
export default function ChatView({
  messages, input, setInput, isLoading, isStreaming,
  attachedFiles, setAttachedFiles, removeAttachment,
  notionEnabled, toggleNotion,
  webSearchEnabled, toggleWebSearch,
  reasoningMode, toggleReasoning,
  streamingEnabled, toggleStreaming,
  sendMessage, retryLast, stopStreaming,
  models, showToast, conversations,
  currentConversationId,
  panelOpen, setPanelOpen, setCurrentView,
  toolSteps,
}) {
  const bottomRef = useRef(null);
  const chatWrapperRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-main relative">
      <ChatTopBar panelOpen={panelOpen} setPanelOpen={setPanelOpen} currentConversationId={currentConversationId} conversations={conversations} />
      <div ref={chatWrapperRef} className="flex-1 overflow-y-auto w-full relative" onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 w-full min-h-full">
            <WelcomeScreen />
            <div className="w-full max-w-[760px] mt-4 flex flex-col items-center animate-in zoom-in-95 duration-700 delay-300 fill-mode-backwards">
              <div className="w-full relative shadow-md rounded-[20px]">
                <InputArea
                  input={input} setInput={setInput}
                  attachedFiles={attachedFiles} setAttachedFiles={setAttachedFiles} removeAttachment={removeAttachment}
                  notionEnabled={notionEnabled} toggleNotion={toggleNotion}
                  webSearchEnabled={webSearchEnabled} toggleWebSearch={toggleWebSearch}
                  reasoningMode={reasoningMode} toggleReasoning={toggleReasoning}
                  streamingEnabled={streamingEnabled} toggleStreaming={toggleStreaming}
                  isLoading={isLoading} isStreaming={isStreaming}
                  sendMessage={sendMessage} stopStreaming={stopStreaming}
                  models={models}
                />
              </div>
              <SuggestionPills setInput={setInput} />
            </div>
          </div>
        ) : (
          <div className="max-w-[760px] mx-auto px-6 pb-6 pt-4 min-h-full flex flex-col">
            <div className="flex flex-col w-full">
              {messages.map((msg, idx) => (
                <MessageItem
                  key={msg.id || idx}
                  msg={msg}
                  showToast={showToast}
                  onRetry={idx === messages.length - 1 && msg.role === 'assistant' ? retryLast : null}
                  isStreamingTarget={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
              {/* Tool Progress — shown while streaming, above the plain thinking indicator */}
              {(isLoading || isStreaming) && toolSteps && toolSteps.length > 0 && (
                <ToolProgressCard steps={toolSteps} />
              )}
              {isLoading && !isStreaming && !toolSteps?.length && <ThinkingIndicator />}
              <div ref={bottomRef} />
            </div>
          </div>
        )}


        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="fixed bottom-24 right-6 w-8 h-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary shadow-lg transition-colors z-10">
            ↓
          </button>
        )}
      </div>

      {/* Sticky Bottom Input (only when chatting) */}
      {messages.length > 0 && (
        <div className="w-full px-6 pb-2 pt-2 bg-bg-main shrink-0 relative z-30">
          <div className="max-w-[760px] mx-auto relative shadow-sm rounded-[24px]">
            <InputArea
              input={input}
              setInput={setInput}
              attachedFiles={attachedFiles}
              setAttachedFiles={setAttachedFiles}
              removeAttachment={removeAttachment}
              notionEnabled={notionEnabled}
              toggleNotion={toggleNotion}
              webSearchEnabled={webSearchEnabled}
              toggleWebSearch={toggleWebSearch}
              reasoningMode={reasoningMode}
              toggleReasoning={toggleReasoning}
              streamingEnabled={streamingEnabled}
              toggleStreaming={toggleStreaming}
              isLoading={isLoading}
              isStreaming={isStreaming}
              sendMessage={sendMessage}
              stopStreaming={stopStreaming}
              models={models}
            />
          </div>
        </div>
      )}
    </div>
  );
}
