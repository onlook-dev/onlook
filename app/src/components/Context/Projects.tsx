import { ProjectsManager } from '@/lib/projects';
import { createContext, useContext } from 'react';

const ProjectsContext = createContext(new ProjectsManager());
export const useProjectManager = () => useContext(ProjectsContext);
