

export interface ProcessedFile {
    path: string;
    content: string | ArrayBuffer;
    isBinary: boolean;
}

export interface Project {
    name: string;
    folderPath: string;
    files: ProcessedFile[];
}



export interface StepProps {
    projectData: Partial<Project>;
    setProjectData: (data: Partial<Project>) => void;
    currentStep: number;
    totalSteps: number;
    prevStep: () => void;
    nextStep: () => void;
    isFinalizing?: boolean;
}