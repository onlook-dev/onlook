import AppBar from './components/AppBar';
import { ThemeProvider } from './components/theme-provider';
import ProjectEditor from './routes/project';

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <AppBar />
            <ProjectEditor />
        </ThemeProvider>
    );
}

export default App;
