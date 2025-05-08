import { createContext, useContext } from 'react';
import { ProjectManager } from './manager';

export const projectManager = new ProjectManager();
const ProjectContext = createContext(projectManager);
export const useProjectManager = () => useContext(ProjectContext);
