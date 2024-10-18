import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepProps } from '..';
import { StepComponent } from '../withStepProps';
import { getRandomPlaceholder } from '../../../helpers';

const NewNameProject: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, nextStep, prevStep } = props;

    const renderHeader = () => (
        <>
            <CardTitle>Let's name your project</CardTitle>
            <CardDescription>If you want it to be different from the project folder name
            </CardDescription>
        </>
    );

    const renderContent = () => (
        <div className="flex flex-col w-full gap-2">
            <Label htmlFor="text">Project Name</Label>
            <Input
                className="bg-secondary"
                type="text"
                placeholder={getRandomPlaceholder()}
                value={projectData.name || ''}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
            />
        </div>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={prevStep} variant="ghost">
                Back
            </Button>
            <Button
                disabled={!projectData.name || projectData.name.length === 0}
                type="button"
                onClick={nextStep}
                variant="outline"
            >
                Next
            </Button>
        </>
    );

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

NewNameProject.Header = (props) => <NewNameProject props={props} variant="header" />;
NewNameProject.Content = (props) => <NewNameProject props={props} variant="content" />;
NewNameProject.Footer = (props) => <NewNameProject props={props} variant="footer" />;

export { NewNameProject };