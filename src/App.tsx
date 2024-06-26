import AppBar from './AppBar';
import { ThemeProvider } from './components/theme-provider';
import ProjectEditor from './routes/editor';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex flex-col h-screen w-screen bg-black">
        <AppBar />
        <ProjectEditor />
      </div>
    </ThemeProvider>
  );
}

export default App;