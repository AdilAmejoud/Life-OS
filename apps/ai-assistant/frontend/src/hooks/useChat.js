import { useState, useRef } from 'react';
import { sendChat, sendChatStream } from '../utils/api';

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function useChat(onChatUpdate) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);

  // Active tool steps for the current assistant turn
  const [toolSteps, setToolSteps] = useState([]);

  const [notionEnabled, setNotionEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [reasoningMode, setReasoningMode] = useState('none');
  const [streamingEnabled, setStreamingEnabled] = useState(true);

  const abortRef = useRef(null);

  const toggleNotion = () => setNotionEnabled(p => !p);
  const toggleWebSearch = () => setWebSearchEnabled(p => !p);
  const toggleStreaming = () => setStreamingEnabled(p => !p);
  const toggleReasoning = () => {
    setReasoningMode(p => (p === 'none' ? 'deep' : 'none'));
  };

  const removeAttachment = (index) => setAttachedFiles(p => p.filter((_, i) => i !== index));

  const newChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    safeStorageSet('currentConversationId', 'new');
    if (onChatUpdate) onChatUpdate();
  };

  const stopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
  };

  const sendStream = async (apiMessages) => {
    const controller = new AbortController();
    abortRef.current = controller;

    // Clear tool steps from any previous turn
    setToolSteps([]);

    try {
      const res = await sendChatStream({
        messages: apiMessages,
        includeNotion: notionEnabled,
        conversationId: currentConversationId,
        reasoningMode,
        webSearchEnabled,
        includeMcpTools: true,
      }, controller.signal);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // Add a blank assistant message that will be filled in progressively
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: '', timestamp: new Date() }]);
      setIsStreaming(true);

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'meta') {
              setCurrentConversationId(data.conversationId);
              safeStorageSet('currentConversationId', data.conversationId);
              if (onChatUpdate) onChatUpdate();
            }

            // ── Agentic tool events ──────────────────────────────────────────
            if (data.type === 'tool_start') {
              setToolSteps(prev => [...prev, { type: 'start', name: data.name, args: data.args, ts: Date.now() }]);
            }
            if (data.type === 'tool_result') {
              setToolSteps(prev => {
                // Mark the matching tool_start as completed
                const updated = [...prev];
                const lastStart = [...updated].reverse().find(s => s.type === 'start' && s.name === data.name);
                if (lastStart) lastStart.result = data.result;
                return updated;
              });
            }

            if (data.type === 'token') {
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  content: msgs[msgs.length - 1].content + data.content
                };
                return msgs;
              });
            }

            if (data.type === 'error') throw new Error(data.error);
          } catch (e) {
            if (e.name === 'AbortError') throw e;
            // ignore JSON parse errors on partial chunks
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: `Error: ${e.message}`, timestamp: new Date() }]);
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  };

  const sendMessage = async (textOverride = null) => {
    let text = typeof textOverride === 'string' ? textOverride : input;
    if (!text.trim() && attachedFiles.length === 0) return;

    if (attachedFiles.length > 0) {
      const fileText = attachedFiles
        .map(f => `[Attached: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``)
        .join('\n\n');
      text = fileText + (text ? '\n\n' + text : '');
      setAttachedFiles([]);
    }

    const newUserMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date() };
    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const apiMessages = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    if (streamingEnabled) {
      await sendStream(apiMessages);
    } else {
      try {
        const res = await sendChat({
          messages: apiMessages,
          includeNotion: notionEnabled,
          conversationId: currentConversationId,
          reasoningMode,
          webSearchEnabled,
          includeMcpTools: true,
        });
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: res.reply, timestamp: new Date() }]);
        setCurrentConversationId(res.conversationId);
        safeStorageSet('currentConversationId', res.conversationId);
        if (onChatUpdate) onChatUpdate();
      } catch (e) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: `Error: ${e.message}`, timestamp: new Date() }]);
      }
    }
    setIsLoading(false);
  };

  const retryLast = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setMessages(prev => prev.filter(m => m !== prev[prev.length - 1]));
    sendMessage(lastUser.content);
  };

  return {
    messages, setMessages, input, setInput,
    isLoading, isStreaming,
    currentConversationId, setCurrentConversationId,
    attachedFiles, setAttachedFiles, removeAttachment,
    notionEnabled, toggleNotion,
    webSearchEnabled, toggleWebSearch,
    reasoningMode, toggleReasoning,
    streamingEnabled, toggleStreaming,
    toolSteps,
    sendMessage, retryLast, newChat, stopStreaming,
  };
}
