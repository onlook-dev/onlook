import { RouteManager } from '@/lib/routes';
import { createContext, ReactNode, useContext } from 'react';

const RouteContext = createContext(new RouteManager());
export const useRouteManager = () => useContext(RouteContext);

const RouteProvider = ({ children }: { children: ReactNode }) => {
    return <RouteContext.Provider value={useRouteManager()}>{children}</RouteContext.Provider>;
};

export default RouteProvider;
