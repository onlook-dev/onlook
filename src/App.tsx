import AppBar from './AppBar';
import { ThemeProvider } from './components/theme-provider';
import ProjectEditor from './routes/editor';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex flex-col h-screen w-screen bg-black">
        <div className="flex-none">
          <AppBar />
        </div>
        <div className='flex-grow overflow-hidden'>
          <ProjectEditor />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;