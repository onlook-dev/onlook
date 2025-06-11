import type React from 'react';
import { withStepProps } from './with-step-props';
import { VerifyProject } from './create/verify-project';

export interface StepContent {
    header: () => React.ReactElement;
    content: () => React.ReactElement;
    footerButtons: () => React.ReactNode;
}

export const newProjectSteps: StepContent[] = [
    withStepProps(VerifyProject),
];
