'use client';

import { cn } from '@onlook/ui/utils';
import { FolderKanban, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Users', href: '/users', icon: Users },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-background">
            <div className="flex h-16 items-center border-b px-6">
                <h1 className="text-xl font-bold">
                    Onlook <span className="text-primary">Admin</span>
                </h1>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href ||
                                   (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            <item.icon className="size-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
