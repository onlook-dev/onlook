import { createContext, useContext } from 'react';
import { StateManager } from './manager';

const stateManager = new StateManager();
const StateContext = createContext(stateManager);
export const useStateManager = () => useContext(StateContext);
