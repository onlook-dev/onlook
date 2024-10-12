import { TooltipProvider } from '@/components/ui/tooltip';
import AppBar from './components/AppBar';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/toaster';
import Routes from './routes';

function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <TooltipProvider>
                <AppBar />
                <Routes />
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
