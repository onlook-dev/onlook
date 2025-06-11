import { useEffect, useState } from 'react';
import { Progress } from './progress';
import { cn } from '../utils';

export interface ProgressWithIntervalProps {
    /** Whether the progress should be actively running */
    isLoading: boolean;
    /** Progress increment per interval (default: 0.167) */
    increment?: number;
    /** Interval duration in milliseconds (default: 100) */
    intervalMs?: number;
    /** Additional CSS classes */
    className?: string;
    /** Maximum progress value (default: 100) */
    maxValue?: number;
    /** Duration to animate to completion when loading stops (default: 300ms) */
    completionDuration?: number;
    /** Callback when progress is complete */
    onComplete?: () => void;
}

export const ProgressWithInterval = ({
    isLoading,
    increment = 0.167,
    intervalMs = 100,
    className,
    maxValue = 100,
    completionDuration = 300,
    onComplete,
}: ProgressWithIntervalProps) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let progressInterval: Timer | null = null;
        let completionTimeout: Timer | null = null;

        if (progressInterval) {
            clearInterval(progressInterval);
        }

        if (isLoading) {
            setProgress(0);
            progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + increment, maxValue));
            }, intervalMs);
        } else {
            // When loading stops, quickly animate to 100%
            if (progress > 0 && progress < maxValue) {
                const remainingProgress = maxValue - progress;
                const steps = Math.ceil(completionDuration / 16); // ~60fps
                const stepIncrement = remainingProgress / steps;

                let currentStep = 0;
                progressInterval = setInterval(() => {
                    currentStep++;
                    if (currentStep >= steps) {
                        setProgress(maxValue);
                        if (progressInterval) clearInterval(progressInterval);
                        onComplete?.();
                        // Reset to 0 after a brief delay
                        completionTimeout = setTimeout(() => {
                            setProgress(0);
                        }, 200);
                    } else {
                        setProgress((prev) => Math.min(prev + stepIncrement, maxValue));
                    }
                }, 16);
            } else {
                setProgress(0);
            }
        }

        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            if (completionTimeout) {
                clearTimeout(completionTimeout);
            }
        };
    }, [isLoading, increment, intervalMs, maxValue, completionDuration]);

    return <Progress value={progress} className={cn('w-full', className)} />;
};
