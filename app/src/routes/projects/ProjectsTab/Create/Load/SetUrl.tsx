import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';
import { StepComponent } from '../withStepProps';
import { MainChannels } from '/common/constants';

const LoadSetUrl: StepComponent = ({ props, variant }) => {
    const { projectData, setProjectData, prevStep, nextStep } = props;
    const [inputValue, setInputValue] = useState<string>(projectData.url || '');
    const [error, setError] = useState<string | null>(null);

    function handleUrlInput(e: React.FormEvent<HTMLInputElement>) {
        setInputValue(e.currentTarget.value);
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

    function validateUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return ['http:', 'https:'].includes(parsedUrl.protocol);
        } catch (e) {
            return false;
        }
    }

    function goBack() {
        window.api.invoke(MainChannels.VERIFY_PROJECT, projectData.folderPath);
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
                value={inputValue}
                type="text"
                placeholder="http://localhost:3000"
                onInput={handleUrlInput}
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
