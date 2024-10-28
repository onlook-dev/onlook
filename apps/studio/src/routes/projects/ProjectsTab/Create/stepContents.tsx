import React, { ReactNode, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRandomPlaceholder } from '../../helpers';
import { StepProps } from './index';
import { Button } from '@/components/ui/button';
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
