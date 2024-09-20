import { useEffect, useState } from 'react';
import { CreateMethod } from '../..';
import { LoadSetUrl } from './Load/SetUrl';
import { LoadVerifyProject } from './Load/Verify';
import { NameProjectStep } from './Name';
import { NewRunProject } from './New/Run';
import { NewSetupProject } from './New/Setup';
import { SelectFolder } from './SelectFolder';
import { Project } from '/common/models/project';

export interface StepProps {
    projectData: Partial<Project>;
    setProjectData: (data: Partial<Project>) => void;
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
    const TOTAL_NEW_STEPS = 4;
    const TOTAL_LOAD_STEPS = 3;
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
    const [totalSteps, setTotalSteps] = useState(0);
    const [projectData, setProjectData] = useState<Partial<Project>>(EMPTY_PROJECT);

    useEffect(() => {
        setCurrentStep(0);
        setProjectData(EMPTY_PROJECT);
        if (createMethod === CreateMethod.NEW) {
            setTotalSteps(TOTAL_NEW_STEPS);
        } else if (createMethod === CreateMethod.LOAD) {
            setTotalSteps(TOTAL_LOAD_STEPS);
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
                return <NameProjectStep props={props} />;
            }
            if (currentStep === 1) {
                return <SelectFolder props={props} />;
            }
            if (currentStep === 2) {
                return <LoadVerifyProject props={props} />;
            }
            if (currentStep === 3) {
                return <LoadSetUrl props={props} />;
            }
        } else if (createMethod === CreateMethod.NEW) {
            if (currentStep === 0) {
                return <NameProjectStep props={props} />;
            }
            if (currentStep === 1) {
                return <SelectFolder props={props} />;
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
