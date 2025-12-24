import React, { useState } from 'react';

const mockDivs = [
  { id: 1, label: 'Header', codeLines: [2, 3] },
  { id: 2, label: 'Main', codeLines: [4] },
  { id: 3, label: 'Footer', codeLines: [5] },
];

const mockCode = [
  '// Type some code ->',
  'console.log("o008 iIlL1 g9qGCQ ~-+=>");',
  '<div>',
  '  <header>Header</header>',
  '  <main>Main content</main>',
  '  <footer>Footer</footer>',
  '</div>',
  '<div>',
  '  <header>Header</header>',
  '  <main>Main content</main>',
  '  <footer>Footer</footer>',
  '</div>', 
  '<div>',
  '  <header>Header</header>',
  '  <main>Main content</main>',
  '  <footer>Footer</footer>',
  '</div>', 
  
  
];

// Add a helper function for simple syntax highlighting
function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

function highlightCode(line: string) {
  // First, escape HTML so tags show up as text
  line = escapeHtml(line);
  // Highlight comments
  line = line.replace(/(\/\/.*)/g, '<span style="color:#C478FF">$1</span>');
  // Highlight strings
  line = line.replace(/(&quot;[^&quot;]*&quot;|&#39;[^&#39;]*&#39;)/g, '<span style="color:#1AC69C">$1</span>');
  // Highlight keywords
  line = line.replace(/\b(function|var|let|const|if|for|return|else|null)\b/g, '<span style="color:#FF32C6">$1</span>');
  // Highlight numbers
  line = line.replace(/\b(\d+)\b/g, '<span style="color:#FFAC60">$1</span>');
  // Highlight function names (simple heuristic: word before parenthesis)
  line = line.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span style="color:#3FA4FF">$1</span>');
  return line;
}

export function CodeOneToOneSection() {
  const [selectedDiv, setSelectedDiv] = useState<number | null>(null);

  return (
    <section className="relative w-full flex justify-center bg-transparent min-h-[480px] max-w-6xl mx-auto px-8">
      <div className="absolute left-0 top-0 w-full max-w-6xl mx-auto z-10 pointer-events-none">
        <h2 className="text-white text-[4vw] leading-[1.1] font-light max-w-4xl text-left ml-12 drop-shadow-xl">
          Truly one-to-one<br />with code
        </h2>
      </div>
      <div className="relative w-full max-w-6xl mx-auto flex items-center justify-start min-h-[420px] mt-24" style={{paddingTop: '7vw'}}>
        {/* Left: Mock Website */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[800px] h-[320px] flex flex-col items-center justify-center z-10">
          <div className="w-full h-full flex flex-col justify-between p-8 gap-6">
            {mockDivs.map((div) => (
              <div
                key={div.id}
                className={`w-full h-14 rounded-lg flex items-center justify-end pr-8 cursor-pointer transition border border-border/10 text-xl font-light ${selectedDiv === div.id ? 'border-blue-500 bg-blue-50' : 'bg-white hover:border-blue-300'}`}
                onClick={() => setSelectedDiv(div.id)}
                style={{ boxShadow: selectedDiv === div.id ? '0 0 0 2px #3b82f6' : undefined }}
              >
                <span className="text-gray-800">{div.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right: Code Overlay */}
        <div className="absolute right-24 top-1/2 -translate-y-1/2 z-20" style={{transform: 'translateY(-50%) translateX(20%)'}}>
          <div className="backdrop-blur-xl bg-background/80 border border-border/10 border-[0.5px] rounded-2xl shadow-xl shadow-black/40 p-3 w-[440px] h-[400px] flex flex-col text-left text-small font-mono text-foreground-secondary relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/10 shadow-2xl p-5" >
            <pre className="relative z-10 whitespace-pre-wrap">
              {mockCode.map((line, idx) => {
                // Highlight lines if selectedDiv matches
                const highlight = selectedDiv && mockDivs.find(d => d.id === selectedDiv)?.codeLines.includes(idx);
                return (
                  <div
                    key={idx}
                    className={`transition flex flex-row items-start text-small px-0 rounded ${highlight ? 'bg-blue-900/60 text-blue-200' : ''}`}
                  >
                    <span
                      className="select-none text-small text-foreground-tertiary/50 font-mono w-6 text-left mr-2 pt-0.5"
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: highlightCode(line) }} />
                  </div>
                );
              })}
            </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 