import { motion, type HTMLMotionProps } from 'motion/react';
import * as React from 'react';

import { cn } from '../utils';

type MotionDivProps = HTMLMotionProps<'div'>;

const MotionCard = React.forwardRef<HTMLDivElement, MotionDivProps>(
    ({ className, style, ...props }, ref) => (
        <motion.div
            ref={ref}
            className={cn('relative', className)}
            style={{
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                backgroundColor: 'hsl(var(--background) /0.6)',
                boxShadow: `
                    0px 0px 0px 0.5px hsl(var(--foreground) /0.2)
                `,
                color: 'var(--card-foreground)',
                ...style,
            }}
            {...props}
        >
            {props.children}
        </motion.div>
    ),
);
MotionCard.displayName = 'MotionCard';

const MotionCardHeader = React.forwardRef<HTMLDivElement, MotionDivProps>(
    ({ className, ...props }, ref) => (
        <motion.div
            ref={ref}
            className={cn('flex flex-col space-y-1.5 p-6', className)}
            {...props}
        />
    ),
);
MotionCardHeader.displayName = 'MotionCardHeader';

const MotionCardTitle = React.forwardRef<HTMLHeadingElement, HTMLMotionProps<'h3'>>(
    ({ className, ...props }, ref) => (
        <motion.h3 ref={ref} className={cn('text-title3', className)} {...props} />
    ),
);
MotionCardTitle.displayName = 'MotionCardTitle';

const MotionCardDescription = React.forwardRef<HTMLParagraphElement, HTMLMotionProps<'p'>>(
    ({ className, ...props }, ref) => (
        <motion.p
            ref={ref}
            className={cn('text-regular text-muted-foreground', className)}
            {...props}
        />
    ),
);
MotionCardDescription.displayName = 'MotionCardDescription';

const MotionCardContent = React.forwardRef<HTMLDivElement, MotionDivProps>(
    ({ className, ...props }, ref) => (
        <motion.div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
    ),
);
MotionCardContent.displayName = 'MotionCardContent';

const MotionCardFooter = React.forwardRef<HTMLDivElement, MotionDivProps>(
    ({ className, ...props }, ref) => (
        <motion.div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
    ),
);
MotionCardFooter.displayName = 'MotionCardFooter';

export {
    MotionCard,
    MotionCardContent,
    MotionCardDescription,
    MotionCardFooter,
    MotionCardHeader,
    MotionCardTitle,
};
