import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileIcon, FilePlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

// Step components for "Load existing project" path
const LoadStep1 = ({
    formData,
    setFormData,
}: {
    formData: FormData;
    setFormData: (data: FormData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 1: Select Project</h2>
        <input
            type="text"
            placeholder="Project Name"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            className="w-full p-2 border rounded"
        />
    </div>
);

const LoadStep2 = ({
    formData,
    setFormData,
}: {
    formData: FormData;
    setFormData: (data: FormData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 2: Configure</h2>
        <select
            value={formData.projectType}
            onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
            className="w-full p-2 border rounded"
        >
            <option value="">Select Project Type</option>
            <option value="react">React</option>
            <option value="vue">Vue</option>
            <option value="angular">Angular</option>
        </select>
    </div>
);

// Step components for "New Onlook project" path
const NewStep1 = ({
    formData,
    setFormData,
}: {
    formData: FormData;
    setFormData: (data: FormData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 1: Project Details</h2>
        <input
            type="text"
            placeholder="Project Name"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            className="w-full p-2 border rounded"
        />
        <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2 border rounded"
        />
    </div>
);

const NewStep2 = ({
    formData,
    setFormData,
}: {
    formData: FormData;
    setFormData: (data: FormData) => void;
}) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Step 2: React Setup</h2>
        <select
            value={formData.reactVersion}
            onChange={(e) => setFormData({ ...formData, reactVersion: e.target.value })}
            className="w-full p-2 border rounded"
        >
            <option value="">Select React Version</option>
            <option value="18">React 18</option>
            <option value="17">React 17</option>
            <option value="16">React 16</option>
        </select>
    </div>
);

const ConfirmationStep = ({ formData }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">Confirmation</h2>
        <p>Project Name: {formData.projectName}</p>
        {formData.projectType && <p>Project Type: {formData.projectType}</p>}
        {formData.description && <p>Description: {formData.description}</p>}
        {formData.reactVersion && <p>React Version: {formData.reactVersion}</p>}
    </div>
);

interface FormData {
    projectName: string;
    projectType: string;
    description: string;
    reactVersion: string;
}

const CreateProject = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [formPath, setFormPath] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        projectName: '',
        projectType: '',
        description: '',
        reactVersion: '',
    });

    const nextStep = () => setCurrentStep(currentStep + 1);
    const prevStep = () => setCurrentStep(currentStep - 1);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
        setIsOpen(false);
    };

    const renderStep = () => {
        if (currentStep === 0) {
            return (
                <div className="h-4/5 w-3/5 flex justify-center flex-col gap-32">
                    <div className="w-full">
                        <p className="text-4xl text-text-active">{'Projects'}</p>
                        <p className="text-text">{"Ready to make some good lookin' app"}</p>
                    </div>
                    <div className="w-full flex gap-px h-2/5 justify-center">
                        <div className="grid grid-cols-2 gap-4">
                            <Card
                                className="border border-border bg-bg-primary hover:bg-blue-900 hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-6 transition"
                                onClick={() => {
                                    setFormPath('load');
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
                                    setFormPath('new');
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

        if (formPath === 'load') {
            if (currentStep === 1) {
                return <LoadStep1 formData={formData} setFormData={setFormData} />;
            }
            if (currentStep === 2) {
                return <LoadStep2 formData={formData} setFormData={setFormData} />;
            }
        } else if (formPath === 'new') {
            if (currentStep === 1) {
                return <NewStep1 formData={formData} setFormData={setFormData} />;
            }
            if (currentStep === 2) {
                return <NewStep2 formData={formData} setFormData={setFormData} />;
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

export default CreateProject;
