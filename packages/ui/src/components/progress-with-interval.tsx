import { useEffect, useRef, useState } from 'react';
import { cn } from '../utils';
import { Progress } from './progress';

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
}

export const ProgressWithInterval = ({
    isLoading,
    increment = 0.167,
    intervalMs = 100,
    className,
    maxValue = 100,
}: ProgressWithIntervalProps) => {
    const [progress, setProgress] = useState(0);
    const progressInterval = useRef<Timer | null>(null);

    useEffect(() => {
        if (progressInterval.current) {
            clearInterval(progressInterval.current);
        }

        if (isLoading) {
            setProgress(0);
            progressInterval.current = setInterval(() => {
                setProgress((prev) => Math.min(prev + increment, maxValue));
            }, intervalMs);
        }

        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [isLoading, increment, intervalMs, maxValue]);

    return <Progress value={progress} className={cn('w-full', className)} />;
};
