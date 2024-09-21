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

export const LoadSetUrl = ({
    props: { projectData, setProjectData, currentStep, totalSteps, prevStep, nextStep },
}: {
    props: StepProps;
}) => {
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
                        value={projectData.url || ''}
                        type="text"
                        placeholder="http://localhost:3000"
                        onInput={(e) =>
                            setProjectData({
                                ...projectData,
                                url: e.currentTarget.value,
                            })
                        }
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
