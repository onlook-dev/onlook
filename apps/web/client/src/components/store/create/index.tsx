import { createContext, useContext, useMemo } from 'react';
import { CreateManager } from './manager';

const CreateContext = createContext<CreateManager | null>(null);

export const useCreateManager = () => {
    const ctx = useContext(CreateContext);
    if (!ctx) throw new Error('useCreateManager must be inside CreateManagerProvider');
    return ctx;
};

export const CreateManagerProvider = ({ children }: {
    children: React.ReactNode,
}) => {
    const createManager = useMemo(() => new CreateManager(), []);

    return (
        <CreateContext.Provider value={createManager} >
            {children}
        </CreateContext.Provider>
    );
};
