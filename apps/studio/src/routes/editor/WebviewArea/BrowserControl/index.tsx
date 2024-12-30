import { useEditorEngine } from '@/components/Context';
import { WebviewState } from '@/lib/editor/engine/webview';
import { EditorMode } from '@/lib/models';
import { DefaultSettings, Theme } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useAnimate } from 'motion/react';
import { nanoid } from 'nanoid/non-secure';
import { useEffect, useRef, useState } from 'react';
import EnabledButton from './EnabledButton';

interface BrowserControlsProps {
    webviewRef: React.RefObject<Electron.WebviewTag> | null;
    webviewSrc: string;
    setWebviewSrc: React.Dispatch<React.SetStateAction<string>>;
    selected: boolean;
    hovered: boolean;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
    setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
    settings: FrameSettings;
    startMove: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    deregisterWebview: () => void;
    domState: WebviewState;
}

const BrowserControls = observer(
    ({
        webviewRef,
        webviewSrc,
        setWebviewSrc,
        selected,
        hovered,
        setHovered,
        setDarkmode,
        settings,
        startMove,
        deregisterWebview,
        domState,
    }: BrowserControlsProps) => {
        const editorEngine = useEditorEngine();
        const [urlInputValue, setUrlInputValue] = useState(webviewSrc);
        const [scopeReload, animateReload] = useAnimate();
        const [editingURL, setEditingURL] = useState(false);
        const [theme, setTheme] = useState(Theme.Device);
        const [state, setState] = useState<WebviewState>(WebviewState.NOT_RUNNING);
        const [editorMode, setEditorMode] = useState(EditorMode.DESIGN);
        const inputRef = useRef<HTMLInputElement>(null);

        useEffect(() => {
            const observer = (state: WebviewState) => {
                setState(state);
            };

            editorEngine.webviews.observeState(settings.id, observer);

            return editorEngine.webviews.unobserveState(settings.id, observer);
        });

        useEffect(() => {
            const observer = (newSettings: FrameSettings) => {
                if (newSettings.theme !== theme) {
                    setTheme(newSettings.theme || DefaultSettings.THEME);
                }
            };

            editorEngine.canvas.observeSettings(settings.id, observer);

            return editorEngine.canvas.unobserveSettings(settings.id, observer);
        }, []);

        useEffect(() => {
            setEditorMode(editorEngine.mode);
        }, [editorEngine.mode]);

        useEffect(() => {
            setUrlInputValue(webviewSrc);
        }, [webviewSrc]);

        useEffect(() => {
            if (editingURL) {
                inputRef.current?.focus();
            }
        }, [editingURL]);

        function goForward() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            if (webview.canGoForward()) {
                webview.goForward();
            }
        }

        function reload() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }

            webview.reload();

            animateReload(
                scopeReload.current,
                { rotate: 360, scale: 0.9 },
                {
                    ease: 'easeInOut',
                    duration: 0.4,
                    onComplete() {
                        animateReload(
                            scopeReload.current,
                            { rotate: 0, scale: 1 },
                            { duration: 0 },
                        );
                    },
                },
            );
        }

        function goBack() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            if (webview.canGoBack()) {
                webview.goBack();
            }
        }

        function getValidUrl(url: string) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return 'http://' + url;
            }
            return url;
        }

        function handleKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
            if (e.key === 'Enter') {
                e.currentTarget.blur();
                setEditingURL(false);
                return;
            }
        }

        function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }

            const validUrl = getValidUrl(e.currentTarget.value);
            webview.src = validUrl;
            webview.loadURL(validUrl);
            setWebviewSrc(validUrl);
            setEditingURL(false);
        }

        async function changeTheme(theme: Theme) {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }

            const themeValue =
                theme === Theme.Device ? 'device' : theme === Theme.Dark ? 'dark' : 'light';

            webview.executeJavaScript(`window.api?.setTheme("${themeValue}")`).then((res) => {
                setDarkmode(res);
                setTheme(theme);
            });

            editorEngine.canvas.saveFrame(settings.id, {
                theme: theme,
            });
        }

        function canGoBack() {
            try {
                return webviewRef?.current?.canGoBack();
            } catch (e) {
                return false;
            }
        }

        function canGoForward() {
            try {
                return webviewRef?.current?.canGoForward();
            } catch (e) {
                return false;
            }
        }

        function duplicateWindow(linked: boolean = false) {
            const currentFrame = settings;
            const newFrame: FrameSettings = {
                id: nanoid(),
                url: currentFrame.url,
                dimension: {
                    width: currentFrame.dimension.width,
                    height: currentFrame.dimension.height,
                },
                position: currentFrame.position,
                duplicate: true,
                linkedIds: linked ? [currentFrame.id] : [],
                aspectRatioLocked: currentFrame.aspectRatioLocked,
                orientation: currentFrame.orientation,
                device: currentFrame.device,
                theme: currentFrame.theme,
            };

            if (linked) {
                currentFrame.linkedIds = [...(currentFrame.linkedIds || []), newFrame.id];
                editorEngine.canvas.saveFrame(currentFrame.id, {
                    linkedIds: currentFrame.linkedIds,
                });
            }

            editorEngine.canvas.frames = [...editorEngine.canvas.frames, newFrame];
        }

        function deleteDuplicateWindow() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            editorEngine.canvas.frames = editorEngine.canvas.frames.filter(
                (frame) => frame.id !== settings.id,
            );

            editorEngine.canvas.frames.forEach((frame) => {
                frame.linkedIds = frame.linkedIds?.filter((id) => id !== settings.id) || null;
            });

            if (webview) {
                deregisterWebview();
            }
        }

        function getCleanURL(url: string) {
            try {
                const urlWithScheme = url.includes('://') ? url : 'http://' + url;
                const urlObject = new URL(urlWithScheme);
                const hostname = urlObject.hostname.replace(/^www\./, '');
                const port = urlObject.port ? ':' + urlObject.port : '';
                const path = urlObject.pathname + urlObject.search;
                return hostname + port + path;
            } catch (error) {
                console.error(error);
                return url;
            }
        }

        function handleSelect() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }
            if (editorEngine.mode === EditorMode.INTERACT) {
                return;
            }
            editorEngine.webviews.deselectAll();
            editorEngine.webviews.select(webview);
            editorEngine.elements.clear();
        }

        function getSelectedColor() {
            if (editorEngine.mode === EditorMode.INTERACT) {
                return 'text-blue-400 fill-blue-400';
            }
            if (domState === WebviewState.DOM_ONLOOK_ENABLED) {
                return 'text-teal-400 fill-teal-400';
            }
            if (domState === WebviewState.DOM_NO_ONLOOK) {
                return 'text-amber-400 fill-amber-400';
            }
            if (domState === WebviewState.NOT_RUNNING && editorEngine.mode === EditorMode.DESIGN) {
                return 'text-foreground-secondary fill-foreground-secondary';
            }
            return '';
        }

        return (
            <div
                className={clsx(
                    'flex flex-row items-center backdrop-blur-sm overflow-hidden',
                    selected ? ' bg-active/60 ' : '',
                    hovered ? ' bg-hover/20 ' : '',
                    selected
                        ? getSelectedColor()
                        : editorMode === EditorMode.INTERACT
                          ? 'text-foreground-secondary fill-foreground-secondary'
                          : 'fill-[#f7f7f7]',
                )}
                onMouseOver={() => setHovered(true)}
                onMouseOut={() => setHovered(false)}
                onClick={handleSelect}
            >
                <div
                    className={`absolute left-0 flex flex-row z-50 `}
                    style={{
                        transition: 'opacity 0.5s, transform 0.5s',
                        transform: editingURL
                            ? 'translateX(-100%)'
                            : selected
                              ? 'translateX(0)'
                              : 'translateX(-100%)',
                        opacity: editingURL ? 0 : selected ? 1 : 0,
                    }}
                >
                    <Button
                        size={'icon'}
                        variant={'ghost'}
                        onClick={goBack}
                        disabled={!canGoBack()}
                    >
                        <Icons.ArrowLeft className="text-inherit h-5 w-5 transition-none" />
                    </Button>

                    <Button
                        size={'icon'}
                        variant={'ghost'}
                        onClick={goForward}
                        style={{
                            transition: 'display 0.5s',
                            display: canGoForward() ? 'flex' : 'none',
                        }}
                    >
                        <Icons.ArrowRight className="text-inherit h-5 w-5" />
                    </Button>
                    <Button size={'icon'} variant={'ghost'} onClick={reload}>
                        {webviewRef?.current?.isLoading() ? (
                            <Icons.CrossL className="text-inherit" />
                        ) : (
                            <Icons.Reload className="text-inherit h-5 w-5" ref={scopeReload} />
                        )}
                    </Button>
                </div>

                <div
                    className={`relative w-full items-center flex flex-row min-h-9 cursor-pointer`}
                    style={{
                        transition: 'padding 0.5s',
                        paddingLeft:
                            selected && canGoForward()
                                ? '7.25rem'
                                : selected && editingURL
                                  ? '0'
                                  : selected
                                    ? '5rem'
                                    : '0',
                        paddingRight: editingURL ? '0' : '5.625rem',
                    }}
                    onMouseDown={(e) => {
                        if (e.target instanceof HTMLInputElement) {
                            return;
                        }
                        if (editingURL) {
                            setEditingURL(false);
                            const validUrl = getValidUrl(urlInputValue);
                            setWebviewSrc(validUrl);
                        }
                        startMove(e);
                    }}
                    onDoubleClick={(e) => {
                        if (
                            e.target instanceof HTMLInputElement ||
                            e.target instanceof HTMLButtonElement ||
                            (e.target as HTMLElement).closest('button')
                        ) {
                            return;
                        }
                        setEditingURL(true);
                    }}
                >
                    <>
                        <Input
                            ref={inputRef}
                            className={cn(
                                'text-regular text-foreground-primary bg-background-secondary/60 w-full overflow-hidden text-ellipsis whitespace-nowrap min-w-[20rem] border-none focus:ring-0 focus:border-0 px-0 leading-none py-0 rounded-none',
                                settings.linkedIds && settings.linkedIds.length > 0 && 'pr-8',
                            )}
                            value={urlInputValue}
                            onChange={(e) => setUrlInputValue(e.target.value)}
                            onKeyDown={handleKeydown}
                            onBlur={handleBlur}
                            style={{
                                transition: 'display 0.5s',
                                display: editingURL ? 'flex' : 'none',
                            }}
                        />
                        <Button
                            className="absolute right-0.5 px-1 group"
                            size={'icon'}
                            variant={'ghost'}
                            onClick={() => setEditingURL(false)}
                            style={{
                                transition: 'transform 0.5s, visibility 0.5s, opacity 0.5s',
                                transform: editingURL ? 'translateX(0)' : 'translateX(-5.625rem)',
                                visibility: editingURL ? 'visible' : 'hidden',
                                opacity: editingURL ? 1 : 0,
                            }}
                        >
                            <Icons.ArrowRight className="text-foreground-secondary group-hover:text-foreground-active h-5 w-5" />
                        </Button>
                    </>

                    <p
                        className="text-regular text-inherit hover:text-opacity-80 transition-colors px-0 h-auto leading-none py-0"
                        style={{
                            transition: 'display 0.5s',
                            display: editingURL ? 'none' : 'flex',
                        }}
                    >
                        {getCleanURL(urlInputValue)}
                    </p>

                    {/* {settings.linkedIds && settings.linkedIds.length > 0 && (
                    <Icons.Link className="text-foreground-secondary absolute right-3" />
                )} */}
                </div>

                <div
                    className="absolute right-0 flex flex-row z-50"
                    style={{
                        transition: 'opacity 0.5s, transform 0.5s',
                        transform: editingURL ? 'translateX(100%)' : 'translateX(0)',
                        opacity: editingURL ? 0 : 1,
                    }}
                >
                    <EnabledButton webviewId={settings.id} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className={cn(
                                    'group transition-none',
                                    state === WebviewState.DOM_ONLOOK_ENABLED && selected
                                        ? 'hover:text-teal-200 hover:bg-teal-400/10'
                                        : state === WebviewState.DOM_NO_ONLOOK && selected
                                          ? 'hover:text-amber-200 hover:bg-amber-400/10'
                                          : '',
                                )}
                                size={'icon'}
                                variant={'ghost'}
                            >
                                <Icons.ChevronDown className="text-inherit h-5 w-5 rotate-0 group-data-[state=open]:-rotate-180 duration-200 ease-in-out" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-md bg-background">
                            <DropdownMenuItem asChild>
                                <Button
                                    variant={'ghost'}
                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                    onClick={() => duplicateWindow(true)}
                                >
                                    <span className="flex w-full items-center text-smallPlus">
                                        <Icons.Copy className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                        <span>Duplicate Window</span>
                                    </span>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Button
                                    variant={'ghost'}
                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                    onClick={reload}
                                >
                                    <span className="flex w-full items-center text-smallPlus">
                                        <Icons.Reload
                                            className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active"
                                            ref={scopeReload}
                                        />
                                        <span>Refresh Window</span>
                                    </span>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="p-0">
                                <div className="flex flex-row hover:bg-transparent focus:bg-transparent w-full">
                                    <Button
                                        variant={'ghost'}
                                        className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                        onClick={goBack}
                                        disabled={!canGoBack()}
                                    >
                                        <Icons.ArrowLeft className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />{' '}
                                        Back
                                    </Button>
                                    <Button
                                        variant={'ghost'}
                                        className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                        onClick={goForward}
                                        disabled={!canGoForward()}
                                    >
                                        <span className="flex w-full items-center text-smallPlus">
                                            <span>Next</span>
                                            <Icons.ArrowRight className="ml-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                        </span>
                                    </Button>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="p-0">
                                <div className="flex flex-row hover:bg-transparent focus:bg-transparent w-full">
                                    <Button
                                        size={'icon'}
                                        variant={'ghost'}
                                        className={`hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group ${theme === Theme.Device ? 'bg-background-tertiary' : ''}`}
                                        onClick={() => changeTheme(Theme.Device)}
                                    >
                                        <Icons.Laptop
                                            className={`${theme === Theme.Device ? 'text-foreground-active' : 'text-foreground-secondary'} group-hover:text-foreground-active`}
                                        />
                                    </Button>
                                    <Button
                                        size={'icon'}
                                        variant={'ghost'}
                                        className={`hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group ${theme === Theme.Dark ? 'bg-background-tertiary' : ''}`}
                                        onClick={() => changeTheme(Theme.Dark)}
                                    >
                                        <Icons.Moon
                                            className={`${theme === Theme.Dark ? 'text-foreground-active' : 'text-foreground-secondary'} group-hover:text-foreground-active`}
                                        />
                                    </Button>
                                    <Button
                                        size={'icon'}
                                        variant={'ghost'}
                                        className={`hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group ${theme === Theme.Light ? 'bg-background-tertiary' : ''}`}
                                        onClick={() => changeTheme(Theme.Light)}
                                    >
                                        <Icons.Sun
                                            className={`${theme === Theme.Light ? 'text-foreground-active' : 'text-foreground-secondary'} group-hover:text-foreground-active`}
                                        />
                                    </Button>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Button
                                    variant={'ghost'}
                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                    onClick={deleteDuplicateWindow}
                                    disabled={!settings.duplicate}
                                >
                                    <span className="flex w-full items-center">
                                        <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                        <span>
                                            {settings.duplicate
                                                ? 'Delete Window'
                                                : "Can't delete this!"}
                                        </span>
                                    </span>
                                </Button>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    },
);

export default BrowserControls;
