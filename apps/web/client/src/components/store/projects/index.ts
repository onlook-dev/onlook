import { createContext, useContext } from 'react';
import { ProjectsManager } from './manager';

const projectsManager = new ProjectsManager();
const ProjectsContext = createContext(projectsManager);
export const useProjectsManager = () => useContext(ProjectsContext);
