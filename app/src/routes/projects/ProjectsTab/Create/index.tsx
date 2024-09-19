import { useState } from 'react';
import { ChooseMethodStep } from './Choose';
import { LoadSelectFolderStep } from './Load/SelectFolder';
import { LoadVerifyProjectStep } from './Load/VerifyProject';
import { NewNameProjectStep } from './New/NameProject';
import { NewSelectFolderFolderStep } from './New/SelectFolder';
import { Project } from '/common/models/project';

export interface StepProps {
    projectData: Project;
    setProjectData: (data: Project) => void;
    currentStep: number;
    totalSteps: number;
    prevStep: () => void;
    nextStep: () => void;
}

export enum CreateMethod {
    LOAD = 'load',
    NEW = 'new',
}

const CreateProject = () => {
    const [createMethod, setCreateMethod] = useState<CreateMethod | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [projectData, setProjectData] = useState<Project>({
        id: '',
        name: '',
        folderPath: '',
        url: '',
        onlookEnabled: false,
        createdAt: '',
        updatedAt: '',
    });

    const nextStep = () => setCurrentStep(currentStep + 1);
    const prevStep = () => setCurrentStep(currentStep - 1);

    const setMethod = (method: CreateMethod) => {
        setCreateMethod(method);
        if (method === CreateMethod.NEW) {
            setTotalSteps(3);
        } else if (method === CreateMethod.LOAD) {
            setTotalSteps(4);
        }
        nextStep();
    };

    const renderStep = () => {
        const props: StepProps = {
            projectData,
            setProjectData,
            currentStep,
            totalSteps,
            prevStep,
            nextStep,
        };

        if (currentStep === 0) {
            return <ChooseMethodStep setMethod={setMethod} />;
        }

        if (createMethod === CreateMethod.LOAD) {
            if (currentStep === 1) {
                return <LoadSelectFolderStep props={props} />;
            }
            if (currentStep === 2) {
                return <LoadVerifyProjectStep props={props} />;
            }
        } else if (createMethod === CreateMethod.NEW) {
            if (currentStep === 1) {
                return <NewNameProjectStep props={props} />;
            }
            if (currentStep === 2) {
                return <NewSelectFolderFolderStep props={props} />;
            }
        }

        if (currentStep === 3) {
            return <>Hi</>;
        }
    };

    return (
        <div className="w-full flex items-center justify-center relative">
            <div className="w-full space-y-4 flex flex-col items-center justify-center">
                {renderStep()}
            </div>
        </div>
    );
};

export default CreateProject;
