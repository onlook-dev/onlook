import { createContext, useContext } from 'react';
import { RealtimeManager } from './manager';
import { projectManager } from '../../project';
import { userManager } from '../../user';

export const realtimeManager = new RealtimeManager(projectManager, userManager);
const RealtimeContext = createContext(realtimeManager);
export const useRealtimeManager = () => useContext(RealtimeContext);
