export function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export function formatMessage(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  html = html.replace(/&lt;think&gt;([\s\S]*?)&lt;\/think&gt;/g, 
    '<details class="mb-4 border border-white/10 rounded-lg p-3 bg-surface-container-low"><summary class="cursor-pointer text-outline font-mono text-xs uppercase tracking-widest">Thinking Process</summary><div class="mt-2 text-sm text-on-surface-variant whitespace-pre-wrap">$1</div></details>'
  );

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const encodedCode = encodeURIComponent(code);
    return `<div class="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0c0e14]">
      <div class="flex justify-between items-center px-4 py-2 bg-surface-container-high border-b border-white/5">
        <span class="font-mono text-xs text-outline">${lang || 'text'}</span>
        <button class="font-mono text-xs text-primary hover:text-primary-container transition-colors" 
          onclick="navigator.clipboard.writeText(decodeURIComponent('${encodedCode}')); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy', 1500)">
          Copy
        </button>
      </div>
      <pre class="p-4 overflow-x-auto"><code class="font-mono text-sm text-on-surface">${code}</code></pre>
    </div>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code class="bg-white/10 rounded px-1.5 py-0.5 font-mono text-sm">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%" class="rounded-lg my-2" />');
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-on-surface">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h4 class="text-base font-bold mt-4 mb-2 text-on-surface">$1</h4>');
  html = html.replace(/^[-*] (.*$)/gm, '<li class="ml-6 list-disc my-1">$1</li>');
  html = html.replace(/\n\n/g, '</p><p class="mb-4">');

  return `<p class="mb-4 leading-relaxed">${html}</p>`;
}
