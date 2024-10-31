import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { MainChannels } from '@onlook/models/constants';
import { cn } from '@onlook/ui/utils';

function ScanPagesButton() {
    const editorEngine = useEditorEngine();

    const onClick = useCallback(async () => {
        try {
            const path = await window.api.invoke(MainChannels.PICK_PAGES_DIRECTORY);

            if (!path) {
                return;
            }

            const pages = (await window.api.invoke(MainChannels.GET_PAGES, path)) as string[];
            editorEngine.projectInfo.pages = pages;
        } catch (error) {
            console.error('Failed to scan pages:', error);
        }
    }, [editorEngine]);

    return (
        <Button variant="outline" size="sm" onClick={onClick}>
            Scan Pages
        </Button>
    );
}

interface PagesTabProps {
    pages: string[];
}

const PagesTab = ({ pages }: PagesTabProps) => {
    const editorEngine = useEditorEngine();

    const handlePageClick = useCallback(
        (page: string) => {
            editorEngine.setCurrentPage(page);

            const webview = editorEngine.webviews.getWebview(
                editorEngine.elements.selected[0]?.webviewId,
            );
            if (!webview) {
                return;
            }

            try {
                const baseUrl = new URL(webview.getURL());
                const newUrl = new URL(page.toLowerCase(), baseUrl.origin);
                webview.loadURL(newUrl.toString());
            } catch (error) {
                console.error('Failed to navigate to page:', error);
            }
        },
        [editorEngine],
    );

    return (
        <div className="w-full h-full">
            {!pages?.length ? (
                <div className="w-full h-full flex items-center justify-center">
                    <ScanPagesButton />
                </div>
            ) : (
                <div className="flex flex-col gap-2 p-2">
                    {pages.map((page) => (
                        <div
                            key={page}
                            className={cn(
                                'group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-background-hover',
                                editorEngine.getCurrentPage() === page && 'bg-background-active',
                            )}
                            onClick={() => handlePageClick(page)}
                        >
                            <Icons.File className="w-4 h-4 opacity-70" />
                            <span className="flex-grow">{page}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePageClick(page);
                                }}
                            >
                                <Icons.ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PagesTab;
