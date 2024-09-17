import { TooltipProvider } from '@/components/ui/tooltip';
import { createContext, useContext } from 'react';
import Announcement from './components/Announcement';
import AppBar from './components/AppBar';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import { AuthManager } from './lib/auth';
import Routes from './routes';
import { useRouteManager } from './routes/Provider';
import { Route } from './lib/routes';

const AuthContext = createContext(new AuthManager());
export const useAuthManager = () => useContext(AuthContext);

function App() {
    const routeManager = useRouteManager();

    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <TooltipProvider>
                {routeManager.route !== Route.LOGIN && <AppBar />}
                <Routes />
                <Announcement />
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
