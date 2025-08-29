import { type UIMessage } from "ai";
import { memo, useRef, useLayoutEffect, useState } from "react";
import { ReasoningDisplay } from "../message-content/reasoning-display";

const CHARACTERS_PER_SECOND = 60;
const UPDATE_INTERVAL_MS = 50;


export const StreamingPart = memo(({ 
    streamingPart, 
    messageId 
}: { 
    streamingPart: UIMessage['parts'][0]; 
    messageId: string 
}) => {
    const fullTextRef = useRef<string>('');
    const [displayText, setDisplayText] = useState<string>('');
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimestampRef = useRef<number>(0);
    const accumulatedTimeMsRef = useRef<number>(0);
    const currentIndexRef = useRef<number>(0);
    const lastUpdateTimeRef = useRef<number>(0);
    const currentMessageIdRef = useRef<string>('');

    const animationStepRef = useRef<((timestamp: number) => void) | undefined>(undefined);
    
    if (!animationStepRef.current) {
        animationStepRef.current = (timestamp: number) => {
            if (lastTimestampRef.current === 0) {
                lastTimestampRef.current = timestamp;
            }
            
            const deltaMs = timestamp - lastTimestampRef.current;
            lastTimestampRef.current = timestamp;
            accumulatedTimeMsRef.current += deltaMs;

            const charsFloat = (accumulatedTimeMsRef.current * CHARACTERS_PER_SECOND) / 1000;
            const charsToAdd = Math.max(1, Math.floor(charsFloat));

            if (charsToAdd > 0) {
                accumulatedTimeMsRef.current -= (charsToAdd * 1000) / CHARACTERS_PER_SECOND;
                const targetLength = fullTextRef.current.length;
                const nextIndex = Math.min(targetLength, currentIndexRef.current + charsToAdd);
                
                currentIndexRef.current = nextIndex;
                
                // Batch updates to reduce React re-renders
                const shouldUpdateUI = timestamp - lastUpdateTimeRef.current >= UPDATE_INTERVAL_MS;
                const isComplete = nextIndex >= targetLength;
                
                if (shouldUpdateUI || isComplete) {
                    setDisplayText(fullTextRef.current.slice(0, nextIndex));
                    lastUpdateTimeRef.current = timestamp;
                }
            }

            // Continue animation if there's more text to reveal
            if (currentIndexRef.current >= fullTextRef.current.length) {
                animationFrameIdRef.current = null;
                return;
            }
            if (animationStepRef.current) {
                animationFrameIdRef.current = requestAnimationFrame(animationStepRef.current);
            }
        };
    }

    if (currentMessageIdRef.current !== messageId) {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        fullTextRef.current = '';
        setDisplayText('');

        currentIndexRef.current = 0;
        lastTimestampRef.current = 0;
        accumulatedTimeMsRef.current = 0;
        lastUpdateTimeRef.current = 0;
        currentMessageIdRef.current = messageId;
    }

    if (streamingPart && streamingPart.type === 'reasoning' && 'text' in streamingPart) {
        const latest = streamingPart.text ?? '';
        const textChanged = fullTextRef.current !== latest;
        
        if (textChanged) {
            fullTextRef.current = latest;
            
            // Start animation if there's text left to reveal and no animation is running
            const needsAnimation = currentIndexRef.current < fullTextRef.current.length;
            if (needsAnimation && !animationFrameIdRef.current) {
                if (animationStepRef.current) {
                    animationFrameIdRef.current = requestAnimationFrame(animationStepRef.current);
                }
            }
        }
    }

    useLayoutEffect(() => {
        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
        };
    }, []);

    if (!streamingPart || streamingPart.type !== 'reasoning' || !('text' in streamingPart)) {
        return null;
    }
    
    return (
        <div className="px-4 py-2 text-small content-start flex flex-col text-wrap gap-2">
            <ReasoningDisplay
                messageId={messageId}
                reasoning={displayText || ''}
                applied={false}
                isStream={true}
            />
        </div>
    );
});

StreamingPart.displayName = 'StreamingPart';
