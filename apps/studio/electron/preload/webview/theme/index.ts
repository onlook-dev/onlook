export function getTheme() {
    return window?.localStorage.getItem('theme') || 'light';
}

export function toggleTheme() {
    const mode = getTheme();

    if (mode === 'dark') {
        document.documentElement.classList.remove('dark');
        window?.localStorage.setItem('theme', 'light');

        return false;
    } else {
        document.documentElement.classList.add('dark');
        window?.localStorage.setItem('theme', 'dark');

        return true;
    }
}

export function setTheme(theme: string) {
    window?.localStorage.setItem('theme', theme);

    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        return true;
    } else {
        document.documentElement.classList.remove('dark');
        return false;
    }
}
