export function goBack() {
    window.history.back();
}

export function goForward() {
    window.history.forward();
}

export function navigateTo(url: string) {
    window.location.href = url;
}