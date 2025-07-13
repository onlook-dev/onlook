'use client';

import { Button } from '@onlook/ui/button';
import { 
    Code, 
    Monitor, 
    Brain, 
    Shield, 
    Database, 
    Sparkles, 
    Terminal, 
    FolderOpen, 
    Palette,
    Settings,
    User,
    Home
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Extension Builder', href: '/dashboard/extension-builder', icon: Code },
        { name: 'System Monitor', href: '/dashboard/system-monitor', icon: Monitor },
        { name: 'AI Wrapper Studio', href: '/dashboard/ai-studio', icon: Brain },
        { name: 'Security Suite', href: '/dashboard/security', icon: Shield },
        { name: 'Database Manager', href: '/dashboard/database', icon: Database },
        { name: 'Project Generator', href: '/dashboard/project-generator', icon: Sparkles },
        { name: 'Portfolio Generator', href: '/dashboard/portfolio-generator', icon: Palette },
        { name: 'Terminal', href: '/dashboard/terminal', icon: Terminal },
        { name: 'File Manager', href: '/dashboard/file-manager', icon: FolderOpen },
        { name: 'Code Playground', href: '/dashboard/playground', icon: Code },
    ];

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-center h-16 px-4 border-b border-gray-800">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Code className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                GeauxCode
                            </span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                                        isActive
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                                >
                                    <item.icon
                                        className={`mr-3 h-5 w-5 transition-colors ${
                                            isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300'
                                        }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="border-t border-gray-800 p-4">
                        <Button variant="ghost" className="w-full justify-start text-gray-300">
                            <User className="mr-3 h-5 w-5" />
                            Profile
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-gray-300 mt-1">
                            <Settings className="mr-3 h-5 w-5" />
                            Settings
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="pl-64">
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}