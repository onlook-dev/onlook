import { RouteManager } from '@/lib/routes';
import { createContext, useContext } from 'react';

const RouteContext = createContext(new RouteManager());
export const useRouteManager = () => useContext(RouteContext);
