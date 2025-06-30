import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { getValidUrl, timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import Link from 'next/link';

export const PreviewDomain = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: domains } = api.domain.getAll.useQuery({ projectId: editorEngine.projectId });
    const preview = domains?.preview;

    if (!preview) {
        return <div>No preview domain found</div>;
    }

    const lastUpdated = preview.publishedAt ? timeAgo(preview.publishedAt) : null;
    const baseUrl = preview.url;
    const validUrl = getValidUrl(baseUrl);

    return (
        <div className="space-y-4 flex flex-col">
            <h2 className="text-lg">Base Domain</h2>
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                    <div className="w-1/3">
                        <p className="text-regularPlus text-muted-foreground">URL</p>
                        <p className="text-small text-muted-foreground">
                            {lastUpdated ? `Updated ${lastUpdated} ago` : 'Not published'}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-1">
                        <Input value={baseUrl} disabled className="bg-muted" />
                        <Link href={validUrl} target="_blank" className="text-sm" >
                            <Button variant="ghost" size="icon">
                                <Icons.ExternalLink className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
});
