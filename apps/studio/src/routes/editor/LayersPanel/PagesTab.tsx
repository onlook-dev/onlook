import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useCallback } from 'react';
import { MainChannels } from '@onlook/models/constants';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

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

const PagesTab = observer(({ pages }: PagesTabProps) => {
    const editorEngine = useEditorEngine();

    console.log('EditorEngine current page:', editorEngine.getCurrentPage());
    console.log('Available pages:', pages);

    const handlePageClick = useCallback(
        (page: string) => {
            console.log('Navigating to page:', page);
            console.log('Selected elements:', editorEngine.elements.selected);
            console.log('All webviews:', editorEngine.webviews);

            let webview = null;
            if (editorEngine.elements.selected.length > 0) {
                webview = editorEngine.webviews.getWebview(
                    editorEngine.elements.selected[0]?.webviewId,
                );
            }

            if (!webview) {
                const frames = editorEngine.canvas.frames;
                if (frames.length > 0) {
                    webview = editorEngine.webviews.getWebview(frames[0].id);
                    console.log('Using fallback webview:', frames[0].id);
                }
            }

            if (!webview) {
                console.error('No webview available');
                return;
            }

            try {
                const baseUrl = new URL(webview.getURL());
                const pagePath = page.startsWith('/') ? page : `/${page.toLowerCase()}`;
                const newUrl = new URL(pagePath, baseUrl.origin).toString();

                editorEngine.setCurrentPage(pagePath);

                webview.loadURL(newUrl).catch((error) => {
                    if (!error.message.includes('ERR_ABORTED')) {
                        console.error('Navigation failed:', error);
                    }
                });
            } catch (error) {
                console.error('Failed to construct URL:', error);
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
                <div className="flex flex-col gap-1 p-2">
                    {pages.map((page) => {
                        const currentPage = editorEngine.getCurrentPage();
                        const normalizedPage = page.startsWith('/')
                            ? page
                            : `/${page.toLowerCase()}`;
                        const isCurrentPage = currentPage === normalizedPage;

                        console.log(
                            `Comparing - Current: "${currentPage}" with Page: "${normalizedPage}" = ${isCurrentPage}`,
                        );

                        return (
                            <div
                                key={page}
                                className={cn(
                                    'group flex items-center gap-2 p-1 rounded-md cursor-pointer hover:bg-background-hover text-xs text-active',
                                    isCurrentPage && 'bg-background-active',
                                    isCurrentPage && 'text-white font-medium',
                                )}
                                onClick={() => handlePageClick(page)}
                            >
                                <Icons.File className="w-4 h-4 opacity-70" />
                                <span className="flex-grow">{page}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-5 h-5 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePageClick(page);
                                    }}
                                >
                                    <Icons.ArrowRight className="w-3 h-3" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

export default PagesTab;
