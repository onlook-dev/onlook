import AppBar from './AppBar';
import { ThemeProvider } from './components/theme-provider';
import ProjectEditor from './routes/project';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex flex-col bg-black h-screen w-screen">
        <AppBar />
        <ProjectEditor />
      </div>
    </ThemeProvider>
  );
}

export default App;