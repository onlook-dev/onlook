import { useProjectsManager } from '@/components/Context';
import { sendAnalytics } from '@/lib/utils';
import { CreateMethod, getStepName } from '@/routes/projects/helpers';
import { useEffect, useState } from 'react';
import { LoadNameProject } from './Load/Name';
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
    const TOTAL_LOAD_STEPS = 4;
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

        if (createMethod === CreateMethod.LOAD) {
            if (currentStep === 0) {
                return <LoadSelectFolder props={props} />;
            }
            if (currentStep === 1) {
                return <LoadVerifyProject props={props} />;
            }
            if (currentStep === 2) {
                return <LoadNameProject props={props} />;
            }
            if (currentStep === 3) {
                return <LoadSetUrl props={props} />;
            }
        } else if (createMethod === CreateMethod.NEW) {
            if (currentStep === 0) {
                return <NewNameProject props={props} />;
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
            try {
                finalizeProject();
                return <p>{'Project created successfully.'}</p>;
            } catch (e: any) {
                return <p className="text-red">{e}</p>;
            }
        }

        return (
            <p className="text-red">
                {'Something went wrong. You should not be seeing this screen.'}
            </p>
        );
    };

    return <div className="mt-72">{renderSteps()}</div>;
};

export default CreateProject;
