import { UpdateManager } from '@/lib/update';
import { createContext, useContext } from 'react';

const UpdateContext = createContext(new UpdateManager());
export const useUpdateManager = () => useContext(UpdateContext);
