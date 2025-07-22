import Script from "next/script";

export default function RootLayout({
    children,
    user
}: {
    children: React.ReactNode;
    user?: any;
}) {
    // Early return for unauthorized users
    if (!user) {
        return <div>Please log in</div>;
    }

    // Early return for suspended accounts
    if (user.status === 'suspended') {
        return <div>Account suspended</div>;
    }

    // Main layout
    return (
        <div className="authenticated-layout">
            <aside className="sidebar">
                <div className="user-info">
                    Welcome, {user.name}!
                </div>
            </aside>
            <main className="content">
                {children}
            </main>
        </div>
    );
}