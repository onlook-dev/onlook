import Announcement from './components/Announcement';
import AppBar from './components/AppBar';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import ProjectEditor from './routes/project';

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <AppBar />
            <ProjectEditor />
            <Announcement />
            <Toaster />
        </ThemeProvider>
    );
}

export default App;
