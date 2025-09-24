'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

export function EditGitHub({ filePath }: { filePath: string }) {
    return (
        <Button
            onClick={() => {
                window.open(
                    `https://github.com/onlook-dev/onlook/blob/main/docs/content/docs/${filePath}`,
                    '_blank',
                );
            }}
            variant="outline"
            className="text-fd-secondary-foreground bg-fd-secondary-background hover:bg-fd-secondary-background/80 mt-8 inline-flex w-fit items-center gap-2 rounded-xl border p-2 text-sm font-medium"
        >
            <Icons.GitHubLogo className="h-4 w-4" />
            Edit on GitHub
        </Button>
    );
}
