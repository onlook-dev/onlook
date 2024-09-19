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

export const NewNameProjectStep = ({
    props: { currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [projectName, setProjectName] = useState<string | null>(null);

    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Let’s name your project'}</CardTitle>
                <CardDescription>
                    {'We’ll set you up with a blank template to start designing'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                <div className="flex flex-col w-full gap-2">
                    <Label htmlFor="text">Project Name</Label>
                    <Input
                        type="text"
                        placeholder="My awesome project"
                        onInput={(e) => setProjectName(e.currentTarget.value)}
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
                        disabled={!projectName || projectName.length === 0}
                        type="button"
                        onClick={nextStep}
                        variant="outline"
                    >
                        Next
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};
