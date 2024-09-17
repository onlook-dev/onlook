import { UpdateManager } from '@/lib/update';
import { createContext, ReactNode, useContext } from 'react';

const UpdateContext = createContext(new UpdateManager());
export const useUpdateManager = () => useContext(UpdateContext);

const AuthProvider = ({ children }: { children: ReactNode }) => {
    return <UpdateContext.Provider value={useUpdateManager()}>{children}</UpdateContext.Provider>;
};

export default AuthProvider;
