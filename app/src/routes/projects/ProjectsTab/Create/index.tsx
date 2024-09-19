import { useState } from 'react';
import { CreateMethod } from '../..';
import { LoadSelectFolderStep } from './Load/SelectFolder';
import { LoadVerifyProjectStep } from './Load/Verify';
import { NewNameProjectStep } from './New/Name';
import { NewRunProject } from './New/Run';
import { NewSelectFolderFolderStep } from './New/SelectFolder';
import { NewSetupProject } from './New/Setup';
import { Project } from '/common/models/project';

export interface StepProps {
    projectData: Project;
    setProjectData: (data: Project) => void;
    currentStep: number;
    totalSteps: number;
    prevStep: () => void;
    nextStep: () => void;
}

const CreateProject = ({
    createMethod,
    setCreateMethod,
}: {
    createMethod: CreateMethod | null;
    setCreateMethod: (method: CreateMethod | null) => void;
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(createMethod === CreateMethod.NEW ? 3 : 4);
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
    const prevStep = () => {
        if (currentStep === 0) {
            setCreateMethod(null);
            return;
        }
        setCurrentStep(currentStep - 1);
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

        if (createMethod === CreateMethod.LOAD) {
            if (currentStep === 0) {
                return <LoadSelectFolderStep props={props} />;
            }
            if (currentStep === 1) {
                return <LoadVerifyProjectStep props={props} />;
            }
            if (currentStep === 2) {
                return <>Hi</>;
            }
        } else if (createMethod === CreateMethod.NEW) {
            if (currentStep === 0) {
                return <NewNameProjectStep props={props} />;
            }
            if (currentStep === 1) {
                return <NewSelectFolderFolderStep props={props} />;
            }
            if (currentStep === 2) {
                return <NewSetupProject props={props} />;
            }
            if (currentStep === 3) {
                return <NewRunProject props={props} />;
            }
        }
    };

    return <div className="mt-40">{renderStep()}</div>;
};

export default CreateProject;
