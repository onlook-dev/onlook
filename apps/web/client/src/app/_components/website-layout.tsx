'use client';

import { TopBar } from './top-bar';
import { Footer } from './landing-page/page-footer';

interface WebsiteLayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
}

export function WebsiteLayout({ children, showFooter = true }: WebsiteLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            {/* Fixed TopBar that persists across page transitions */}
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50 top-bar">
                <TopBar />
            </div>
            
            {/* Page content */}
            <div>
                {children}
            </div>
            
            {/* Footer */}
            {showFooter && <Footer />}
        </div>
    );
} 