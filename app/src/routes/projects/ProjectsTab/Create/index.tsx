import backgroundImage from '@/assets/dunes-create.png';
import { useProjectsManager } from '@/components/Context';
import { sendAnalytics } from '@/lib/utils';
import { CreateMethod, getStepName } from '@/routes/projects/helpers';
import { useEffect, useState } from 'react';
import { LoadSelectFolder } from './Load/SelectFolder';
import { LoadSetUrl } from './Load/SetUrl';
import { LoadVerifyProject } from './Load/Verify';
import { NewNameProject } from './New/Name';
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
    const projectsManager = useProjectsManager();

    const TOTAL_NEW_STEPS = 4;
    const TOTAL_LOAD_STEPS = 3;
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [projectData, setProjectData] = useState<Partial<Project>>({
        url: 'http://localhost:3000',
    });

    useEffect(() => {
        setCurrentStep(0);
        setProjectData({ url: 'http://localhost:3000' });

        if (createMethod === CreateMethod.NEW) {
            setTotalSteps(TOTAL_NEW_STEPS);
        } else if (createMethod === CreateMethod.LOAD) {
            setTotalSteps(TOTAL_LOAD_STEPS);
        }
        sendAnalytics('start create project', { method: createMethod });
    }, [createMethod]);

    const nextStep = () => setCurrentStep(currentStep + 1);
    const prevStep = () => {
        if (currentStep === 0) {
            setCreateMethod(null);
            return;
        }
        setCurrentStep(currentStep - 1);
    };

    const finalizeProject = () => {
        if (!projectData.name || !projectData.url || !projectData.folderPath) {
            throw new Error('Project data is missing.');
        }

        const newProject = projectsManager.createProject(
            projectData.name,
            projectData.url,
            projectData.folderPath,
        );

        projectsManager.project = newProject;
        sendAnalytics('create project', {
            url: newProject.url,
            method: createMethod,
            id: newProject.id,
        });
        setCreateMethod(null);
    };

    const renderSteps = () => {
        const props: StepProps = {
            projectData,
            setProjectData,
            currentStep,
            totalSteps,
            prevStep,
            nextStep,
        };

        sendAnalytics('creation step', {
            method: createMethod,
            step: currentStep,
            stepName: getStepName(createMethod, currentStep),
        });

        let stepComponent;

        if (createMethod === CreateMethod.LOAD) {
            if (currentStep === 0) {
                stepComponent = <LoadSelectFolder props={props} />;
            } else if (currentStep === 1) {
                stepComponent = <LoadVerifyProject props={props} />;
            } else if (currentStep === 2) {
                stepComponent = <LoadSetUrl props={props} />;
            }
        } else if (createMethod === CreateMethod.NEW) {
            if (currentStep === 0) {
                stepComponent = <NewNameProject props={props} />;
            } else if (currentStep === 1) {
                stepComponent = <NewSelectFolder props={props} />;
            } else if (currentStep === 2) {
                stepComponent = <NewSetupProject props={props} />;
            } else if (currentStep === 3) {
                stepComponent = <NewRunProject props={props} />;
            }
        }

        if (!stepComponent) {
            try {
                finalizeProject();
                return <p>{'Project created successfully.'}</p>;
            } catch (e: any) {
                return <p className="text-red">{e}</p>;
            }
        }

        return (
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-background/50" />
                <div className="relative z-10">{stepComponent}</div>
            </div>
        );
    };

    return <div className="fixed inset-0">{renderSteps()}</div>;
};

export default CreateProject;
