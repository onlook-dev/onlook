import type React from 'react';
import type { StepProps } from './index';
import { NewSelectFolder } from './New/SelectFolder';
import { NewSetupProject } from './New/Setup';
import { NewRunProject } from './New/Run';
import { LoadSelectFolder } from './Load/SelectFolder';
import { LoadVerifyProject } from './Load/Verify';
import { LoadSetUrl } from './Load/SetUrl';
import { NewNameProject } from './New/Name';
import { withStepProps } from './withStepProps';

export interface StepContent {
    header: React.FC<StepProps>;
    content: React.FC<StepProps>;
    footerButtons: (props: StepProps) => React.ReactNode;
}

export const newProjectSteps: StepContent[] = [
    withStepProps(NewNameProject),
    withStepProps(NewSelectFolder),
    withStepProps(NewSetupProject),
    withStepProps(NewRunProject),
];

export const loadProjectSteps: StepContent[] = [
    withStepProps(LoadSelectFolder),
    withStepProps(LoadVerifyProject),
    withStepProps(LoadSetUrl),
];
