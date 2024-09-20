import { useEffect, useState } from 'react';
import { CreateMethod } from '../..';
import { LoadSelectFolder } from './Load/SelectFolder';
import { LoadSetUrl } from './Load/SetUrl';
import { LoadVerifyProject } from './Load/Verify';
import { NewNameProjectStep } from './New/Name';
import { NewRunProject } from './New/Run';
import { NewSelectFolder } from './New/SelectFolder';
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
    const EMPTY_PROJECT: Project = {
        id: '',
        name: '',
        folderPath: '',
        url: '',
        onlookEnabled: false,
        createdAt: '',
        updatedAt: '',
    };
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(4);
    const [projectData, setProjectData] = useState<Project>(EMPTY_PROJECT);

    useEffect(() => {
        setCurrentStep(0);
        setProjectData(EMPTY_PROJECT);
        if (createMethod === CreateMethod.NEW) {
            setTotalSteps(4);
        } else if (createMethod === CreateMethod.LOAD) {
            setTotalSteps(3);
        }
    }, [createMethod]);

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
                return <LoadSelectFolder props={props} />;
            }
            if (currentStep === 1) {
                return <LoadVerifyProject props={props} />;
            }
            if (currentStep === 2) {
                return <LoadSetUrl props={props} />;
            }
        } else if (createMethod === CreateMethod.NEW) {
            if (currentStep === 0) {
                return <NewNameProjectStep props={props} />;
            }
            if (currentStep === 1) {
                return <NewSelectFolder props={props} />;
            }
            if (currentStep === 2) {
                return <NewSetupProject props={props} />;
            }
            if (currentStep === 3) {
                return <NewRunProject props={props} />;
            }
        }
    };

    return <div className="mt-72">{renderStep()}</div>;
};

export default CreateProject;
