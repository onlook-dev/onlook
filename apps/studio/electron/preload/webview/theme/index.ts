export function getTheme() {
    try {
        return window?.localStorage.getItem('theme') || 'light';
    } catch (error) {
        console.warn('Failed to get theme', error);
        return 'light';
    }
}

export function setTheme(theme: string) {
    try {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            window?.localStorage.setItem('theme', 'dark');
            return true;
        } else {
            document.documentElement.classList.remove('dark');
            window?.localStorage.setItem('theme', 'light');
            return false;
        }
    } catch (error) {
        console.warn('Failed to set theme', error);
        return false;
    }
}
