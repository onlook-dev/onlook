'use client';

import { useOnboarding } from '@/components/onboarding/onboarding-context';
import { useEditorEngine } from '@/components/store/editor';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';

export const OnboardingOverlay = () => {
    const { currentStep, isActive, nextStep, completeOnboarding } = useOnboarding();
    const editorEngine = useEditorEngine();
    const [showGlow, setShowGlow] = useState(false);
    const [showText, setShowText] = useState(false);
    const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isFadingIn, setIsFadingIn] = useState(false);
    const [blinkTrigger, setBlinkTrigger] = useState(0);

    useEffect(() => {
        if (isActive && currentStep === 0) {
            // Find the chat input element
            const chatInput = document.querySelector('[data-onboarding-target="chat-input"]');
            if (chatInput) {
                setTargetElement(chatInput as HTMLElement);
                
                // Delay the glow appearance
                const glowTimer = setTimeout(() => setShowGlow(true), 300);
                const textTimer = setTimeout(() => setShowText(true), 800);
                
                return () => {
                    clearTimeout(glowTimer);
                    clearTimeout(textTimer);
                };
            }
        } else if (isActive && currentStep === 1) {
            // Find the project toolbar element
            const toolbar = document.querySelector('[data-onboarding-target="project-toolbar"]');
            if (toolbar) {
                setTargetElement(toolbar as HTMLElement);
                
                // Delay the glow appearance
                const glowTimer = setTimeout(() => setShowGlow(true), 300);
                const textTimer = setTimeout(() => setShowText(true), 800);
                
                return () => {
                    clearTimeout(glowTimer);
                    clearTimeout(textTimer);
                };
            }
        } else if (isActive && currentStep === 2) {
            // Find the left panel element
            const leftPanel = document.querySelector('[data-onboarding-target="left-panel"]');
            if (leftPanel) {
                setTargetElement(leftPanel as HTMLElement);
                
                // Delay the glow appearance
                const glowTimer = setTimeout(() => setShowGlow(true), 300);
                const textTimer = setTimeout(() => setShowText(true), 800);
                
                return () => {
                    clearTimeout(glowTimer);
                    clearTimeout(textTimer);
                };
            }
        } else if (isActive && currentStep === 3) {
            // Find the mode toggle element
            const modeToggle = document.querySelector('[data-onboarding-target="mode-toggle"]');
            if (modeToggle) {
                setTargetElement(modeToggle as HTMLElement);
                
                // Delay the glow appearance
                const glowTimer = setTimeout(() => setShowGlow(true), 300);
                const textTimer = setTimeout(() => setShowText(true), 800);
                
                return () => {
                    clearTimeout(glowTimer);
                    clearTimeout(textTimer);
                };
            }
        } else if (isActive && currentStep === 4) {
            // Find the top-right actions element
            const topRightActions = document.querySelector('[data-onboarding-target="top-right-actions"]');
            if (topRightActions) {
                setTargetElement(topRightActions as HTMLElement);
                
                // Delay the glow appearance
                const glowTimer = setTimeout(() => setShowGlow(true), 300);
                const textTimer = setTimeout(() => setShowText(true), 800);
                
                return () => {
                    clearTimeout(glowTimer);
                    clearTimeout(textTimer);
                };
            }
        } else {
            setShowGlow(false);
            setShowText(false);
            setTargetElement(null);
        }
    }, [isActive, currentStep]);

    // Clear any selected elements and frames when onboarding becomes active
    useEffect(() => {
        if (isActive) {
            editorEngine.elements.clear();
            editorEngine.frames.deselectAll();
            setIsFadingOut(false);
            setIsFadingIn(true);
            // Set to false after animation completes
            const timer = setTimeout(() => setIsFadingIn(false), 100);
            return () => clearTimeout(timer);
        }
    }, [isActive, editorEngine]);

    // Handle fade out and completion
    useEffect(() => {
        if (isFadingOut) {
            const timer = setTimeout(() => {
                completeOnboarding();
                setIsFadingOut(false);
            }, 700); // Match the fade-in duration
            
            return () => clearTimeout(timer);
        }
    }, [isFadingOut, completeOnboarding]);

    const handleFinish = () => {
        setShowGlow(false);
        setShowText(false);
        setIsFadingOut(true);
    };

    if (!isActive || (currentStep !== 0 && currentStep !== 1 && currentStep !== 2 && currentStep !== 3 && currentStep !== 4) || !targetElement) {
        return null;
    }

    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // For step 1 (toolbar), position the glow below the toolbar
    const isToolbarStep = currentStep === 1;
    // For step 2 (left panel), position the glow on the left side
    const isLeftPanelStep = currentStep === 2;
    // For step 3 (mode toggle), position the glow around the toggle
    const isModeToggleStep = currentStep === 3;
    // For step 4 (top-right actions), position the glow around the actions
    const isTopRightStep = currentStep === 4;
    
    const glowTop = isToolbarStep 
        ? rect.bottom - 80 
        : isLeftPanelStep 
            ? rect.top - 50
            : isModeToggleStep
                ? rect.top - 30
                : isTopRightStep
                    ? rect.top - 30
                    : rect.top - 50;
    const glowLeft = isToolbarStep 
        ? rect.left - 100 
        : isLeftPanelStep
            ? rect.left - 100
            : isModeToggleStep
                ? rect.left - 50
                : isTopRightStep
                    ? rect.left - 50
                    : rect.left - 100;

    return (
        <>
            {/* Dark overlay over the rest of the interface - blocks all interactions */}
            <div 
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto z-[5]",
                    "transition-opacity duration-700 ease-in-out",
                    isFadingOut || isFadingIn ? "opacity-0" : "opacity-100"
                )}
            />
            
            {/* High z-index transparent overlay to block ALL interactions above the dark overlay */}
            <div 
                className="fixed inset-0 pointer-events-auto z-[9998] cursor-default"
                style={{ background: 'transparent' }}
                onClick={() => setBlinkTrigger(prev => prev + 1)}
            />
            
            {/* Large radial glow - positioned around target element */}
            <div 
                className={cn(
                    "fixed pointer-events-none rounded-3xl",
                    "bg-gradient-to-br from-fuchsia-500/30 via-pink-400/40 to-rose-600/35",
                    "shadow-[0_0_100px_rgba(236,72,153,0.6),0_0_200px_rgba(236,72,153,0.4),0_0_300px_rgba(236,72,153,0.2)]",
                    "blur-md will-change-[opacity,transform]",
                    "transition-[opacity,left,top,width,height] duration-700 ease-in-out",
                    showGlow && !isFadingOut ? "opacity-100" : "opacity-0",
                    isTopRightStep ? "z-[60]" : (isToolbarStep || isLeftPanelStep || isModeToggleStep) ? "z-10" : "z-[60]"
                )}
                style={{
                    left: isTopRightStep ? glowLeft + 50 : glowLeft,
                    top: glowTop,
                    width: isModeToggleStep ? rect.width + 100 : isTopRightStep ? rect.width : rect.width + 100,
                    height: (isModeToggleStep || isTopRightStep) ? rect.height + 60 : rect.height + 100,
                    transform: 'scale(1.1) translateZ(0)',
                }}
            />
            
            {/* Additional outer glow layer */}
            <div 
                className={cn(
                    "fixed pointer-events-none rounded-full",
                    "bg-gradient-to-t from-fuchsia-600/20 via-transparent to-pink-500/25",
                    "shadow-[0_0_150px_rgba(192,38,211,0.4),0_0_300px_rgba(192,38,211,0.2)]",
                    "blur-lg will-change-[opacity,transform]",
                    "transition-[opacity,left,top,width,height] duration-900 ease-in-out",
                    showGlow && !isFadingOut ? "opacity-80" : "opacity-0",
                    isTopRightStep ? "z-[60]" : (isToolbarStep || isLeftPanelStep || isModeToggleStep) ? "z-10" : "z-[60]"
                )}
                style={{
                    left: isTopRightStep ? glowLeft : glowLeft - 50,
                    top: glowTop - 50,
                    width: isModeToggleStep ? rect.width + 200 : isTopRightStep ? rect.width + 100 : rect.width + 300,
                    height: (isModeToggleStep || isTopRightStep) ? rect.height + 160 : rect.height + 200,
                    transform: 'scale(1.2) translateZ(0)',
                }}
            />
            
            {/* Extra large ambient glow */}
            <div 
                className={cn(
                    "fixed pointer-events-none rounded-full",
                    "bg-gradient-radial from-fuchsia-500/10 via-transparent to-transparent",
                    "shadow-[0_0_200px_rgba(236,72,153,0.3)]",
                    "blur-xl will-change-[opacity,transform]",
                    "transition-[opacity,left,top,width,height] duration-1000 ease-in-out",
                    showGlow && !isFadingOut ? "opacity-60" : "opacity-0",
                    isTopRightStep ? "z-[60]" : (isToolbarStep || isLeftPanelStep || isModeToggleStep) ? "z-10" : "z-[60]"
                )}
                style={{
                    left: isTopRightStep ? glowLeft - 50 : glowLeft - 100,
                    top: glowTop - 100,
                    width: isModeToggleStep ? rect.width + 300 : isTopRightStep ? rect.width + 200 : rect.width + 400,
                    height: (isModeToggleStep || isTopRightStep) ? rect.height + 260 : rect.height + 300,
                    transform: 'scale(1.3) translateZ(0)',
                }}
            />

            {/* Floating Text */}
            {showText && (
                <div 
                    className={cn(
                        "fixed z-[9999]",
                        "transition-opacity duration-500 ease-in-out opacity-100"
                    )}
                    style={{
                        left: isLeftPanelStep ? rect.right + 20 : isTopRightStep ? rect.right - 350 : isModeToggleStep ? centerX - 150 : centerX - 150,
                        top: isToolbarStep ? rect.top - 120 : isLeftPanelStep ? rect.top + 80 : isModeToggleStep ? rect.bottom + 30 : isTopRightStep ? rect.bottom + 50 : centerY - 200,
                        width: 300,
                        pointerEvents: 'auto',
                    }}
                >
                <div className={cn(
                    "relative w-80 flex flex-col gap-4",
                    isLeftPanelStep ? "items-start justify-start left-0" : "items-center justify-center right-2 bottom-2"
                )}>
                        {/* Main text */}
                        <p className={cn(
                            "text-foreground-primary text-title2 leading-tight font-thin text-balance",
                            isLeftPanelStep ? "text-left" : "text-center",
                            "animate-in fade-in slide-in-from-bottom-2 duration-500"
                        )}>
                            {isToolbarStep 
                                ? "Use these tools to design and interact with your project."
                                : isLeftPanelStep
                                    ? "Access your layers, branding, pages, and more from here."
                                    : isModeToggleStep
                                        ? "Switch between Design and Preview modes to edit or view your project."
                                        : isTopRightStep
                                            ? "Invite colleagues or publish your work to share it with the world."
                                            : "Type your first message here to begin designing your project."
                            }
                        </p>
                        
                        {/* Buttons */}
                        <div className="flex flex-row items-center gap-4">
                            {!isTopRightStep && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFinish();
                                    }}
                                    className="text-foreground-primary/70 hover:text-foreground-primary text-small underline transition-colors duration-200 pointer-events-auto"
                                >
                                    Skip Tour
                                </button>
                            )}
                            
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isTopRightStep) {
                                        handleFinish();
                                    } else {
                                        setShowGlow(false);
                                        setShowText(false);
                                        nextStep();
                                    }
                                }}
                                className="px-4 py-2 text-primary-foreground hover:opacity-90 text-small rounded-md pointer-events-auto relative overflow-hidden"
                            >
                                <span 
                                    key={blinkTrigger}
                                    className={cn(
                                        "absolute inset-0 bg-primary",
                                        blinkTrigger > 0 && "animate-blink-bg"
                                    )}
                                    onAnimationEnd={() => setBlinkTrigger(0)}
                                ></span>
                                <span className="relative z-10">{isTopRightStep ? 'Finish' : 'Next'}</span>
                            </button>
                        </div>
                        
                    </div>
                </div>
            )}
            
            <style jsx>{`
                @keyframes buttonBlinkBg {
                    0%, 100% {
                        opacity: 1;
                    }
                    12.5%, 37.5% {
                        opacity: 0.4;
                    }
                    25%, 50% {
                        opacity: 1;
                    }
                }
                
                :global(.animate-blink-bg) {
                    animation: buttonBlinkBg 0.6s ease-in-out;
                }
            `}</style>
        </>
    );
};
