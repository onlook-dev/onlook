import { useEffect, useState } from 'react';
import { CreateMethod } from '../..';
import { LoadSelectFolder } from './Load/SelectFolder';
import { LoadSetUrl } from './Load/SetUrl';
import { LoadVerifyProject } from './Load/Verify';
import { NameProjectStep } from './Name';
import { NewRunProject } from './New/Run';
import { NewSelectFolder } from './New/SelectFolder';
import { NewSetupProject } from './New/Setup';
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
    const TOTAL_LOAD_STEPS = 4;
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [projectData, setProjectData] = useState<Partial<Project>>({});

    useEffect(() => {
        setCurrentStep(0);
        setProjectData({ url: 'http://localhost:3000' });

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
                return <LoadSelectFolder props={props} />;
            }
            if (currentStep === 1) {
                return <NameProjectStep props={props} />;
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
                return <NewSelectFolder props={props} />;
            }
            if (currentStep === 2) {
                return <NewSetupProject props={props} />;
            }
            if (currentStep === 3) {
                return <NewRunProject props={props} />;
            }
        }

        if (currentStep === 4) {
            return <p className="text-white">{JSON.stringify(projectData)}</p>;
        }
    };

    return <div className="mt-72">{renderStep()}</div>;
};

export default CreateProject;
