import '@fontsource-variable/inter';
import { Toaster } from '@onlook/ui/toaster';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { I18nextProvider } from 'react-i18next';
import { AppBar } from './components/AppBar';
import { Modals } from './components/Modals';
import { ThemeProvider } from './components/ThemeProvider';
import i18n from './i18n';
import { Routes } from './routes';

function App() {
    return (
        <I18nextProvider i18n={i18n}>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <TooltipProvider>
                    <AppBar />
                    <Routes />
                    <Modals />
                    <Toaster />
                </TooltipProvider>
            </ThemeProvider>
        </I18nextProvider>
    );
}

export default App;
