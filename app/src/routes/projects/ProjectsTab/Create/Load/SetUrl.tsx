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

export const LoadSetUrl = ({
    props: { currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [projectUrl, setProjectUrl] = useState<string>('http://localhost:3000');

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
                        value={projectUrl}
                        type="text"
                        placeholder="http://localhost:3000"
                        onInput={(e) => setProjectUrl(e.currentTarget.value)}
                    />
                </div>
            </CardContent>
            <CardFooter className="text-sm">
                <p>{`${currentStep + 1} of ${totalSteps}`}</p>
                <div className="flex ml-auto gap-2">
                    <Button type="button" onClick={prevStep} variant="ghost">
                        Back
                    </Button>
                    <Button
                        disabled={!projectUrl || projectUrl.length === 0}
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
