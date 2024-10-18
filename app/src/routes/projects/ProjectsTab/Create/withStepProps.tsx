import React from 'react';
import { StepProps } from './index';
import { MotionCardContent, MotionCardHeader, MotionCardFooter } from '@/components/ui/motion-card';

interface StepComponentProps {
    props: StepProps;
    variant: 'header' | 'content' | 'footer';
}

export interface StepComponent extends React.FC<StepComponentProps> {
    Header: React.FC<StepProps>;
    Content: React.FC<StepProps>;
    Footer: React.FC<StepProps>;
}

export function withStepProps(Component: StepComponent): {
    header: React.FC<StepProps>;
    content: React.FC<StepProps>;
    footerButtons: (props: StepProps) => React.ReactNode;
} {
    return {
        header: (props: StepProps) => (
            <MotionCardHeader>
                <Component props={props} variant="header" />
            </MotionCardHeader>
        ),
        content: (props: StepProps) => (
            <MotionCardContent className="flex items-center w-full min-h-24">
                <Component props={props} variant="content" />
            </MotionCardContent>
        ),
        footerButtons: (props: StepProps) => <Component props={props} variant="footer" />,
    };
}
