'use client';

import { SignInMethod } from '@onlook/models/auth';
import localforage from 'localforage';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { devLogin, login } from '../login/actions';

const LAST_SIGN_IN_METHOD_KEY = 'lastSignInMethod';

interface AuthContextType {
    signingInMethod: SignInMethod | null;
    lastSignInMethod: SignInMethod | null;
    isAuthModalOpen: boolean;
    setIsAuthModalOpen: (open: boolean) => void;
    handleLogin: (method: SignInMethod.GITHUB | SignInMethod.GOOGLE) => void;
    handleDevLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [lastSignInMethod, setLastSignInMethod] = useState<SignInMethod | null>(null);
    const [signingInMethod, setSigningInMethod] = useState<SignInMethod | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    useEffect(() => {
        localforage.getItem(LAST_SIGN_IN_METHOD_KEY).then((lastSignInMethod: unknown) => {
            setLastSignInMethod(lastSignInMethod as SignInMethod | null);
        });
    }, []);

    const handleLogin = async (method: SignInMethod.GITHUB | SignInMethod.GOOGLE) => {
        setSigningInMethod(method);
        await login(method);

        localforage.setItem(LAST_SIGN_IN_METHOD_KEY, method);
        setTimeout(() => {
            setSigningInMethod(null);
        }, 5000);
    };

    const handleDevLogin = async () => {
        setSigningInMethod(SignInMethod.DEV);
        await devLogin();
        setTimeout(() => {
            setSigningInMethod(null);
        }, 5000);
    }

    return (
        <AuthContext.Provider value={{ signingInMethod, lastSignInMethod, handleLogin, handleDevLogin, isAuthModalOpen, setIsAuthModalOpen }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within a AuthProvider');
    }
    return context;
}; 