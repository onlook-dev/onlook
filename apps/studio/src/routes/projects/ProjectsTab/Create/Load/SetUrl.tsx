import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import type React from 'react';
import { useState } from 'react';
import type { StepComponent } from '../withStepProps';

const LoadSetUrl: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, prevStep, nextStep } = props;
    const [projectUrl, setProjectUrl] = useState<string>(projectData.url || '');
    const [runCommand, setRunCommand] = useState<string>(projectData.runCommand || '');
    const [error, setError] = useState<string | null>(null);

    function handleUrlInput(e: React.FormEvent<HTMLInputElement>) {
        setProjectUrl(e.currentTarget.value);
        if (!validateUrl(e.currentTarget.value)) {
            setError('Please use a valid URL');
            return;
        } else {
            setError(null);
        }
        setProjectData({
            ...projectData,
            url: e.currentTarget.value,
        });
    }

    function handleRunCommandInput(e: React.FormEvent<HTMLInputElement>) {
        setRunCommand(e.currentTarget.value);
        setProjectData({
            ...projectData,
            runCommand: e.currentTarget.value,
        });
    }

    function validateUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return ['http:', 'https:'].includes(parsedUrl.protocol);
        } catch (e) {
            return false;
        }
    }

    function goBack() {
        invokeMainChannel(MainChannels.VERIFY_PROJECT, projectData.folderPath);
        prevStep();
    }

    const renderHeader = () => (
        <>
            <CardTitle>{'Set your project URL'}</CardTitle>
            <CardDescription>{'Where is your project running locally?'}</CardDescription>
        </>
    );

    const renderContent = () => (
        <div className="flex flex-col w-full gap-2">
            <Label htmlFor="text">Local Url</Label>
            <Input
                className="bg-secondary"
                value={projectUrl}
                type="text"
                placeholder="http://localhost:3000"
                onInput={handleUrlInput}
            />
            <Label htmlFor="text">Run Command</Label>
            <Input
                className="bg-secondary"
                value={runCommand}
                type="text"
                placeholder="npm run dev"
                onInput={handleRunCommandInput}
            />
            <p className="text-red-500 text-sm">{error || ''}</p>
        </div>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={goBack} variant="ghost">
                Back
            </Button>
            <Button
                disabled={!projectData.url || projectData.url.length === 0}
                type="button"
                onClick={nextStep}
                variant="outline"
            >
                Complete setup
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

LoadSetUrl.Header = (props) => <LoadSetUrl props={props} variant="header" />;
LoadSetUrl.Content = (props) => <LoadSetUrl props={props} variant="content" />;
LoadSetUrl.Footer = (props) => <LoadSetUrl props={props} variant="footer" />;
LoadSetUrl.Header.displayName = 'LoadSetUrl.Header';
LoadSetUrl.Content.displayName = 'LoadSetUrl.Content';
LoadSetUrl.Footer.displayName = 'LoadSetUrl.Footer';

export { LoadSetUrl };
