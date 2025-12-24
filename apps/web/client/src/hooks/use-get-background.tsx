import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const createDark = '/assets/dunes-create-dark.png';
const createLight = '/assets/dunes-create-light.png';
const loginDark = '/assets/dunes-login-dark.png';
const loginLight = '/assets/dunes-login-light.png';

export const useGetBackground = (type: 'create' | 'login') => {
    const [backgroundImage, setBackgroundImage] = useState<string>(createDark);
    const { theme } = useTheme();

    useEffect(() => {
        const determineBackgroundImage = () => {
            // Force dark theme for now
            const isDark = true;
            // const isDark = theme === Theme.Dark || (theme === Theme.System && window.matchMedia('(prefers-color-scheme: dark)').matches);
            const images = {
                create: isDark ? createDark : createLight,
                login: isDark ? loginDark : loginLight,
            };
            return images[type];
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);
    return backgroundImage;
};
