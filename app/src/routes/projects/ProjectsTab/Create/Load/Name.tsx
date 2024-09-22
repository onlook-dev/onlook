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

export const LoadNameProject = ({
    props: { projectData, currentStep, setProjectData, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
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
                    {"We'll install the necessary dependencies for you"}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-24 flex items-center w-full">
                <div className="flex flex-col w-full gap-2">
                    <Label htmlFor="text">Project Name</Label>
                    <Input
                        type="text"
                        placeholder="My awesome project"
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