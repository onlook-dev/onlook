import { AuthManager } from '@/lib/auth';
import { createContext, useContext } from 'react';

const AuthContext = createContext(new AuthManager());
export const useAuthManager = () => useContext(AuthContext);
