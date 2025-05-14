import { createContext, useContext } from 'react';
import { CreateManager } from './manager';

const createManager = new CreateManager();
const CreateContext = createContext(createManager);
export const useCreateManager = () => useContext(CreateContext);
