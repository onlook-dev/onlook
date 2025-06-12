import type React from 'react';
import { MotionCardContent, MotionCardHeader } from '@onlook/ui/motion-card';

interface StepComponentProps {
    variant: 'header' | 'content' | 'footer';
}

export interface StepComponent extends React.FC<StepComponentProps> {
    Header: React.FC;
    Content: React.FC;
    Footer: React.FC;
}

export function withStepProps(Component: StepComponent): {
    header: () => React.ReactElement;
    content: () => React.ReactElement;
    footerButtons: () => React.ReactNode;
} {
    return {
        header: () => (
            <MotionCardHeader>
                <Component variant="header" />
            </MotionCardHeader>
        ),
        content: () => (
            <MotionCardContent className="flex items-center w-full min-h-24">
                <Component variant="content" />
            </MotionCardContent>
        ),
        footerButtons: () => <Component variant="footer" />,
    };
}