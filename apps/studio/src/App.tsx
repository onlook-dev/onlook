import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { TooltipProvider } from '@onlook/ui/tooltip';
import AppBar from './components/AppBar';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from '@onlook/ui/toaster';
import Routes from './routes';
import '@fontsource-variable/inter';

function App() {
    return (
        <I18nextProvider i18n={i18n}>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <TooltipProvider>
                    <AppBar />
                    <Routes />
                    <Toaster />
                </TooltipProvider>
            </ThemeProvider>
        </I18nextProvider>
    );
}

export default App;
