import type React from 'react';
import type { StepProps } from '../constants';
import { withStepProps } from './with-step-props';
import { VerifyProject } from './create/verify-project';

export interface StepContent {
    header: React.FC<StepProps>;
    content: React.FC<StepProps>;
    footerButtons: (props: StepProps) => React.ReactNode;
}

export const newProjectSteps: StepContent[] = [
    withStepProps(VerifyProject),
];
