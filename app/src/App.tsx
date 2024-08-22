import { TooltipProvider } from '@/components/ui/tooltip';
import Announcement from './components/Announcement';
import AppBar from './components/AppBar';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import ProjectEditor from './routes/project';
function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <TooltipProvider>
                <AppBar />
                <ProjectEditor />
                <Announcement />
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
