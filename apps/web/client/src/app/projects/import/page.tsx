'use client';

import { useGetBackground } from '@/hooks/use-get-background';
import { Routes } from '@/utils/constants';
import { Card, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { useRouter } from 'next/navigation';
import { TopBar } from '../_components/top-bar';

type ImportType = 'local' | 'github' | 'figma';

const importCards: {
    type: ImportType;
    title: string;
    description: string;
    icon: React.ReactNode;
    ariaLabel: string;
}[] = [
    {
        type: 'local',
        title: 'Import a Local Project',
        description:
            'Select a directory from your computer to start working with your project in Pixelraft.',
        icon: <Icons.Upload className="w-6 h-6 text-primary" />,
        ariaLabel: 'Import local project',
    },
    {
        type: 'github',
        title: 'Import from GitHub',
        description:
            'Connect your GitHub account to import repositories and create pull requests from Pixelraft.',
        icon: <Icons.GitHubLogo className="w-6 h-6 text-primary" />,
        ariaLabel: 'Import from GitHub',
    },
    {
        type: 'figma',
        title: 'Import from Figma',
        description:
            'Paste a Figma file URL to generate a Pixelraft-ready starter project and synced design metadata.',
        icon: <Icons.Layout className="w-6 h-6 text-primary" />,
        ariaLabel: 'Import from Figma',
    },
];

const importPathMap: Record<ImportType, string> = {
    local: `${Routes.IMPORT_PROJECT}/local`,
    github: Routes.IMPORT_GITHUB,
    figma: Routes.IMPORT_FIGMA,
};

const Page = () => {
    const router = useRouter();
    const backgroundUrl = useGetBackground('create');

    const handleCardClick = (type: ImportType) => {
        router.push(importPathMap[type]);
    };

    return (
        <div
            className="w-screen h-screen flex flex-col"
            style={{
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundImage: `url(${backgroundUrl})`,
            }}
        >
            <TopBar />
            <div className="flex items-center justify-center overflow-hidden max-w-6xl mx-auto w-full flex-1 gap-6 p-6 select-none">
                {importCards.map((card) => (
                    <Card
                        key={card.type}
                        className="w-full h-64 cursor-pointer transition-all duration-200 bg-background/80 backdrop-blur-xl hover:shadow-lg hover:scale-[1.02] border-[0.5px] border-foreground-tertiary/50"
                        onClick={() => handleCardClick(card.type)}
                        tabIndex={0}
                        role="button"
                        aria-label={card.ariaLabel}
                    >
                        <CardHeader className="flex flex-col justify-between h-full">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center select-none">
                                {card.icon}
                            </div>
                            <div className="space-y-2">
                                <CardTitle className="text-title3">{card.title}</CardTitle>
                                <CardDescription className="text-sm text-balance">
                                    {card.description}
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Page;
