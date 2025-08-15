'use client';

export function HighlightText({ text, searchQuery }: { text: string; searchQuery: string }) {
    if (!searchQuery) return <>{text}</>;
    const safe = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${safe})`, 'gi'));
    return (
        <>
            {parts.map((part, index) =>
                part.toLowerCase() === searchQuery.toLowerCase() ? (
                    <span key={index} className="font-medium text-foreground">
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </>
    );
}
