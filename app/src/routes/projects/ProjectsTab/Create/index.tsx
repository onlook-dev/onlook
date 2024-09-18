import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileIcon, FilePlusIcon } from '@radix-ui/react-icons';
import { FormEvent, useState } from 'react';
import { LoadStep1, LoadStep2 } from './LoadProject';
import { NewStep1, NewStep2 } from './NewProject';

export interface ProjectData {
    projectName: string;
    projectType: string;
    description: string;
    reactVersion: string;
}

export enum FormPath {
    LOAD = 'load',
    NEW = 'new',
}

const ConfirmationStep = ({ formData }: { formData: ProjectData }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Confirmation</h2>
        <p>Project Name: {formData.projectName}</p>
        {formData.projectType && <p>Project Type: {formData.projectType}</p>}
        {formData.description && <p>Description: {formData.description}</p>}
        {formData.reactVersion && <p>React Version: {formData.reactVersion}</p>}
    </div>
);

const CreateProject = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [formPath, setFormPath] = useState<FormPath | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        projectName: '',
        projectType: '',
        description: '',
        reactVersion: '',
    });

    const nextStep = () => setCurrentStep(currentStep + 1);
    const prevStep = () => setCurrentStep(currentStep - 1);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        setIsOpen(false);
    };

    const renderStep = () => {
        if (currentStep === 0) {
            return (
                <div className="h-4/5 w-3/5 flex justify-center flex-col gap-32">
                    <div className="w-full min-w-[180px] h-full gap-5 flex flex-col">
                        <h1 className="text-4xl text-text-active">{'Projects'}</h1>
                        <p className="text-text">{openingMessage}</p>
                    </div>
                    <div className="w-full flex gap-px h-2/5 justify-center">
                        <div className="grid grid-cols-2 gap-4">
                            <Card
                                className="border border-border bg-bg-primary hover:bg-blue-900 hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-6 transition"
                                onClick={() => {
                                    setFormPath(FormPath.LOAD);
                                    nextStep();
                                }}
                            >
                                <div className="rounded-full p-2 bg-gray-400">
                                    <FileIcon className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-medium text-text-active">
                                    {'Load existing project'}
                                </h3>
                                <p className="text-xs text-text">{'Work on your React UI'}</p>
                            </Card>
                            <Card
                                className="border border-blue-800 bg-blue-900/50 hover:bg-blue-900 hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-6 transition"
                                onClick={() => {
                                    setFormPath(FormPath.NEW);
                                    nextStep();
                                }}
                            >
                                <div className="rounded-full p-2 bg-blue-500">
                                    <FilePlusIcon className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-medium"> {'New Onlook project'} </h3>
                                <p className="text-xs text-blue-200"> {'Start a React App'} </p>
                            </Card>
                        </div>
                    </div>
                </div>
            );
        }

        if (formPath === FormPath.LOAD) {
            if (currentStep === 1) {
                return <LoadStep1 formData={formData} setProjectData={setFormData} />;
            }
            if (currentStep === 2) {
                return <LoadStep2 formData={formData} setProjectData={setFormData} />;
            }
        } else if (formPath === FormPath.NEW) {
            if (currentStep === 1) {
                return <NewStep1 formData={formData} setProjectData={setFormData} />;
            }
            if (currentStep === 2) {
                return <NewStep2 formData={formData} setProjectData={setFormData} />;
            }
        }

        if (currentStep === 3) {
            return <ConfirmationStep formData={formData} />;
        }
    };

    return (
        <div className="w-full flex items-center justify-center relative">
            <form
                onSubmit={handleSubmit}
                className="w-full space-y-4 flex flex-col items-center justify-center"
            >
                {renderStep()}
                <div className="flex justify-between mt-4">
                    {currentStep > 0 && (
                        <Button type="button" onClick={prevStep} variant="outline">
                            Previous
                        </Button>
                    )}
                    {currentStep > 0 && currentStep < 3 && (
                        <Button type="button" onClick={nextStep}>
                            Next
                        </Button>
                    )}
                    {currentStep === 3 && <Button type="submit">Submit</Button>}
                </div>
            </form>
        </div>
    );
};

const messages = [
    "Ready to make some good lookin' apps",
    "What a week... right? Doesn't matter, let's build!",
    "These apps aren't gunna design themselves",
    'Time to unleash your inner designer',
    'Release your inner artist today',
    "Let's craft some beautiful UIs!",
    "*crackles knuckles* Let's get building!",
    'Another day another design',
    "Can't wait to see what you create!",
    "Let's design something fresh today",
    "Let's get to work",
    "What time is it? It's time to build!",
    "ಠ_ಠ   Why aren't you designing?   ಠ_ಠ",
];

const openingMessage = messages[Math.floor(Math.random() * messages.length)];

export default CreateProject;
