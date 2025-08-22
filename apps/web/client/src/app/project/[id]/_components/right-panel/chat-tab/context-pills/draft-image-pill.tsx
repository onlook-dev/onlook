import { type MessageContext, MessageContextType } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getTruncatedName } from './helpers';

export const DraftImagePill = React.forwardRef<
    HTMLDivElement,
    {
        context: MessageContext;
        onRemove: () => void;
    }
>(({ context, onRemove }, ref) => {
    const [showPreview, setShowPreview] = useState(false);
    const [pillPosition, setPillPosition] = useState({ x: 0, y: 0 });
    const pillRef = useRef<HTMLSpanElement>(null);

    const handleShowPreview = () => {
        // Capture the pill's position RIGHT NOW before showing the modal
        if (pillRef.current) {
            const rect = pillRef.current.getBoundingClientRect();
            setPillPosition({ 
                x: rect.left + rect.width / 2, 
                y: rect.top + rect.height / 2 
            });
        }
        setShowPreview(true);
    };

    if (context.type !== MessageContextType.IMAGE) {
        console.warn('DraftingImagePill received non-image context');
        return null;
    }

    return (
        <>
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showPreview && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
                                onClick={() => setShowPreview(false)}
                                transition={{ duration: 0.3 }}
                            />
                            
                            {/* Preview Image */}
                            <motion.img
                                src={context.content}
                                alt="Screenshot preview"
                                className="fixed z-[9999] object-contain pointer-events-auto"
                                style={{
                                    width: "28px",
                                    height: "28px",
                                    left: pillPosition.x,
                                    top: pillPosition.y,
                                    transformOrigin: "center",
                                }}
                                initial={{
                                    scale: 0,
                                    x: "-50%",
                                    y: "-50%"
                                }}
                                animate={{ 
                                    scale: Math.min(window.innerWidth * 0.5 / 28, window.innerHeight * 0.75 / 28),
                                    x: `calc(50vw - ${pillPosition.x}px - 50%)`,
                                    y: `calc(50vh - ${pillPosition.y}px - 50%)`
                                }}
                                exit={{
                                    scale: 0,
                                    x: "-50%",
                                    y: "-50%"
                                }}
                                transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
                                onClick={() => setShowPreview(false)}
                            />
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <motion.span
            layout="position"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
                duration: 0.2,
                layout: {
                    duration: 0.15,
                    ease: 'easeOut',
                },
            }}
            className="group relative flex flex-row items-center gap-1 justify-center border bg-background-tertiary rounded-md h-7 cursor-pointer"
            key={context.displayName}
            ref={pillRef}
            onClick={handleShowPreview}
        >
            {/* Left side: Image thumbnail */}
            <div className="w-7 h-7 flex items-center justify-center overflow-hidden relative">
                <img
                    src={context.content}
                    alt={context.displayName}
                    className="w-full h-full object-cover rounded-l-md"
                />
                <div className="absolute inset-0 border-l-[1px] border-y-[1px] rounded-l-md border-white/10 pointer-events-none" />
            </div>

            {/* Right side: Filename */}
            <span className="text-xs overflow-hidden whitespace-nowrap text-ellipsis max-w-[100px] pr-1">
                {getTruncatedName(context)}
            </span>

            {/* Hover X button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 p-1 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
                <Icons.CrossL className="w-2.5 h-2.5 text-primary-foreground" />
            </button>
        </motion.span>
        </>
    );
});

DraftImagePill.displayName = 'DraftImagePill';
