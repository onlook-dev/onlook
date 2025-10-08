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
        <Breadcrumb>
            <BreadcrumbList className='gap-1 sm:gap-1'>
                <BreadcrumbItem>
                    <BreadcrumbLink
                        className="cursor-pointer hover:text-foreground-primary"
                        onClick={() => onNavigate('/')}
                    >
                        Root
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbSegments.map((segment, index) => (
                    <div className="flex items-center gap-1" key={segment.path}>
                        <BreadcrumbSeparator className="p-0 m-0">
                            <Icons.ChevronRight className="w-3 h-3 p-0 m-0" />
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
                    </div>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
};