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
import { useState } from 'react';
import { StepProps } from '..';
import { MainChannels } from '/common/constants';

export const LoadSetUrl = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
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

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Set your project URL'}</CardTitle>
                <CardDescription>{'Where is your project running locally?'}</CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                <div className="flex flex-col w-full gap-2">
                    <Label htmlFor="text">Local Url</Label>
                    <Input
                        value={inputValue}
                        type="text"
                        placeholder="http://localhost:3000"
                        onInput={handleUrlInput}
                    />
                    <p className="text-red-500 text-sm">{error || ''}</p>
                </div>
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
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
                </div>
            </CardFooter>
        </Card>
    );
};
