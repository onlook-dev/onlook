'use client';

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@onlook/ui/breadcrumb';
import { Icons } from '@onlook/ui/icons';
import type { BreadcrumbSegment } from './types';

interface BreadcrumbNavigationProps {
    breadcrumbSegments: BreadcrumbSegment[];
    onNavigate: (path: string) => void;
}

export const BreadcrumbNavigation = ({ breadcrumbSegments, onNavigate }: BreadcrumbNavigationProps) => {
    return (
        <div className="flex flex-col gap-2">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink
                            className="cursor-pointer hover:text-foreground-primary"
                            onClick={() => onNavigate('/')}
                        >
                            Root
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbSegments.map((segment, index) => (
                        <>
                            <BreadcrumbSeparator className="p-0 m-0">
                                <Icons.ChevronRight className="w-3 h-3" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem key={segment.path}>
                                <BreadcrumbLink
                                    className={index === breadcrumbSegments.length - 1
                                        ? "text-foreground-primary font-medium"
                                        : "cursor-pointer hover:text-foreground-primary"
                                    }
                                    onClick={() => index !== breadcrumbSegments.length - 1 && onNavigate(segment.path)}
                                >
                                    {segment.name}
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                        </>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
};