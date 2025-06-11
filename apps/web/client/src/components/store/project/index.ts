import { createContext, useContext } from 'react';
import { DomainsManager } from './domain';
import { ProjectManager } from './manager';

export const projectManager = new ProjectManager();
const ProjectContext = createContext(projectManager);
export const useProjectManager = () => useContext(ProjectContext);

export const domainsManager = new DomainsManager(projectManager);
const DomainsManagerContext = createContext(domainsManager);
export const useDomainsManager = () => useContext(DomainsManagerContext);