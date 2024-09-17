import { TooltipProvider } from '@/components/ui/tooltip';
import Announcement from './components/Announcement';
import AppBar from './components/AppBar';
import AuthProvider from './components/AuthProvider';
import RouteProvider from './components/RouteProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/toaster';
import Routes from './routes';

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <TooltipProvider>
                <AuthProvider>
                    <RouteProvider>
                        <AppBar />
                        <Routes />
                        <Announcement />
                        <Toaster />
                    </RouteProvider>
                </AuthProvider>
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
