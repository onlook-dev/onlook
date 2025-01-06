export function getTheme() {
    return window?.localStorage.getItem('theme') || 'light';
}

export function setTheme(mode?: string) {
    const theme = mode || getTheme();
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        window?.localStorage.setItem('theme', 'dark');
        return true;
    } else {
        document.documentElement.classList.remove('dark');
        window?.localStorage.setItem('theme', 'light');
        return false;
    }
}
