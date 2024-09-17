import { AuthManager } from '@/lib/auth';
import { createContext, ReactNode, useContext } from 'react';

const AuthContext = createContext(new AuthManager());
export const useAuthManager = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: ReactNode }) => {
    return <AuthContext.Provider value={useAuthManager()}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
