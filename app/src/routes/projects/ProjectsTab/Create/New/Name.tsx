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
import { useEffect, useState } from 'react';
import { StepProps } from '..';

export const NewNameProject = ({
    props: { projectData, currentStep, setProjectData, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    useEffect(() => {
        setPlaceholderIndex(Math.floor(Math.random() * PLACEHOLDERS.length));
    }, []);

    function setProjectName(name: string) {
        setProjectData({
            ...projectData,
            name,
        });
    }
    return (
        <Card className="w-[30rem]">
            <CardHeader>
                <CardTitle>{'Let’s name your project'}</CardTitle>
                <CardDescription>
                    {'If you want it to be different from the folder name'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                <div className="flex flex-col w-full gap-2">
                    <Label htmlFor="text">Project Name</Label>
                    <Input
                        type="text"
                        placeholder={PLACEHOLDERS[placeholderIndex]}
                        value={projectData.name || ''}
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
                        disabled={!projectData.name || projectData.name.length === 0}
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

const PLACEHOLDERS = [
    'The greatest app in the world',
    'My epic project',
    'The greatest project ever',
    'A revolutionary idea',
    'Project X',
    'Genius React App',
    'The next billion dollar idea',
    'Mind-blowingly cool app',
    'Earth-shatteringly great app',
    'Moonshot project',
];
