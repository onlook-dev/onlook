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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCode(line: string) {
    // First, escape HTML so tags show up as text
    line = escapeHtml(line);
    // Highlight comments
    line = line.replace(/(\/\/.*)/g, '<span style="color:#C478FF">$1</span>');
    // Highlight strings
    line = line.replace(
        /(&quot;[^&quot;]*&quot;|&#39;[^&#39;]*&#39;)/g,
        '<span style="color:#1AC69C">$1</span>',
    );
    // Highlight keywords
    line = line.replace(
        /\b(function|var|let|const|if|for|return|else|null)\b/g,
        '<span style="color:#FF32C6">$1</span>',
    );
    // Highlight numbers
    line = line.replace(/\b(\d+)\b/g, '<span style="color:#FFAC60">$1</span>');
    // Highlight function names (simple heuristic: word before parenthesis)
    line = line.replace(
        /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
        '<span style="color:#3FA4FF">$1</span>',
    );
    return line;
}

export function CodeOneToOneSection() {
    const [selectedDiv, setSelectedDiv] = useState<number | null>(null);

    return (
        <section className="relative mx-auto flex min-h-[480px] w-full max-w-6xl justify-center bg-transparent px-8">
            <div className="pointer-events-none absolute top-0 left-0 z-10 mx-auto w-full max-w-6xl">
                <h2 className="ml-12 max-w-4xl text-left text-[4vw] leading-[1.1] font-light text-white drop-shadow-xl">
                    Truly one-to-one
                    <br />
                    with code
                </h2>
            </div>
            <div
                className="relative mx-auto mt-24 flex min-h-[420px] w-full max-w-6xl items-center justify-start"
                style={{ paddingTop: '7vw' }}
            >
                {/* Left: Mock Website */}
                <div className="relative z-10 flex h-[320px] w-full max-w-[800px] flex-col items-center justify-center rounded-2xl bg-white shadow-xl">
                    <div className="flex h-full w-full flex-col justify-between gap-6 p-8">
                        {mockDivs.map((div) => (
                            <div
                                key={div.id}
                                className={`border-border/10 flex h-14 w-full cursor-pointer items-center justify-end rounded-lg border pr-8 text-xl font-light transition ${selectedDiv === div.id ? 'border-blue-500 bg-blue-50' : 'bg-white hover:border-blue-300'}`}
                                onClick={() => setSelectedDiv(div.id)}
                                style={{
                                    boxShadow:
                                        selectedDiv === div.id ? '0 0 0 2px #3b82f6' : undefined,
                                }}
                            >
                                <span className="text-gray-800">{div.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Right: Code Overlay */}
                <div
                    className="absolute top-1/2 right-24 z-20 -translate-y-1/2"
                    style={{ transform: 'translateY(-50%) translateX(20%)' }}
                >
                    <div className="bg-background/80 border-border/10 text-small text-foreground-secondary relative flex h-[400px] w-[440px] flex-col overflow-hidden rounded-2xl border border-[0.5px] p-3 text-left font-mono shadow-xl shadow-black/40 backdrop-blur-xl">
                        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 p-5 shadow-2xl">
                            <pre className="relative z-10 whitespace-pre-wrap">
                                {mockCode.map((line, idx) => {
                                    // Highlight lines if selectedDiv matches
                                    const highlight =
                                        selectedDiv &&
                                        mockDivs
                                            .find((d) => d.id === selectedDiv)
                                            ?.codeLines.includes(idx);
                                    return (
                                        <div
                                            key={idx}
                                            className={`text-small flex flex-row items-start rounded px-0 transition ${highlight ? 'bg-blue-900/60 text-blue-200' : ''}`}
                                        >
                                            <span
                                                className="text-small text-foreground-tertiary/50 mr-2 w-6 pt-0.5 text-left font-mono select-none"
                                                aria-hidden="true"
                                            >
                                                {idx + 1}
                                            </span>
                                            <span
                                                dangerouslySetInnerHTML={{
                                                    __html: highlightCode(line),
                                                }}
                                            />
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
