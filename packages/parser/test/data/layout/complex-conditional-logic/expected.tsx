import { useRouter } from 'next/router';
import Script from "next/script";

export default function Layout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const isAuthPage = router.pathname.startsWith('/auth');
    const isAdminPage = router.pathname.startsWith('/admin');

    if (isAuthPage) {
        return (
            <div className="auth-layout">
                <div className="auth-container">
                    {children}
                </div>
            </div>
        );
    }

    if (isAdminPage) {
        return (
            <div className="admin-layout">
                <nav>Admin Nav</nav>
                <main>{children}</main>
            </div>
        );
    }

    return (
        <div className="main-layout">
            <header>Main Header</header>
            <main>{children}</main>
            <footer>Main Footer</footer>
        </div>
    );
}