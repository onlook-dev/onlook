import { TooltipProvider } from '@/components/ui/tooltip';
// import Announcement from './components/Announcement';
import AppBar from './components/AppBar';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import CreateModal from './routes/create';
import ProjectEditor from './routes/project';
function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <TooltipProvider>
                <AppBar />
                <ProjectEditor />
                {/* <Announcement /> */}
                <CreateModal />
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}

export default App;
