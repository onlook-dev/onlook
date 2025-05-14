import { createContext, useContext } from 'react';
import { userManager } from '../user';
import { ProjectsManager } from './manager';

const projectsManager = new ProjectsManager(userManager);
const ProjectsContext = createContext(projectsManager);
export const useProjectsManager = () => useContext(ProjectsContext);
