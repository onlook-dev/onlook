# Iframe Refresh System - Simplified Approach

## Overview

Simple iframe reload system with linear backoff. When Penpal connection fails, reload the iframe with increasing delays.

## Core Principle

**No soft retries - just reload the iframe.**

When Penpal connection fails, immediately reload the entire iframe instead of trying to reconnect to the same iframe multiple times.

## Architecture Decision

**All logic lives in `index.tsx` (FrameView component)**

- ✅ Parent component manages both iframe lifecycle AND reload logic
- ✅ Parent holds reload counter state (persists across remounts)
- ✅ Child component (`view.tsx`) becomes purely presentational
- ✅ Simpler - single source of truth for all reload behavior

## Connection Flow

```
Iframe Load (FrameView renders FrameComponent)
    ↓
Single Penpal Connection Attempt (in view.tsx)
    ↓ fail → calls onConnectionFailed callback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FrameView schedules reload (2s delay)
    ↓
FrameView increments reloadKey → remounts FrameComponent
    ↓
Single Penpal Connection Attempt
    ↓ fail → calls onConnectionFailed callback
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FrameView schedules reload (3s delay)
    ↓
FrameView increments reloadKey → remounts FrameComponent
    ↓
Single Penpal Connection Attempt
    ↓ fail
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Continues with linear backoff (4s, 5s, 6s...)
```

## Backoff Strategy

**Linear backoff for iframe reloads:**
- Base delay: 2000ms (2 seconds)
- Increment: 1000ms (1 second)
- Pattern: 2s, 3s, 4s, 5s, 6s...
- **No maximum limit** - keeps trying forever

## Implementation

### File: `index.tsx` (FrameView Component)

**This component manages everything:**
- Reload counter state
- Reload scheduling with backoff
- Iframe mounting via `reloadKey`
- Connection success/failure handling

```typescript
export const FrameView = observer(({ frame, isInDragSelection = false }: { frame: Frame; isInDragSelection?: boolean }) => {
    const editorEngine = useEditorEngine();
    const iFrameRef = useRef<IFrameView>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [hasTimedOut, setHasTimedOut] = useState(false);

    // Reload tracking state (persists across FrameComponent remounts)
    const reloadCountRef = useRef(0);
    const reloadBaseDelay = 2000;
    const reloadIncrement = 1000;

    const isSelected = editorEngine.frames.isSelected(frame.id);

    const branchData = editorEngine.branches.getBranchDataById(frame.branchId);
    const isConnecting = branchData?.sandbox?.session?.isConnecting ?? false;

    const preloadScriptReady = branchData?.sandbox?.preloadScriptInjected ?? false;
    const isFrameReady = preloadScriptReady && !(isConnecting && !hasTimedOut);

    // 30s timeout monitoring for slow connections
    useEffect(() => {
        if (!isConnecting) {
            setHasTimedOut(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            const currentBranchData = editorEngine.branches.getBranchDataById(frame.branchId);
            const stillConnecting = currentBranchData?.sandbox?.session?.isConnecting ?? false;

            if (stillConnecting) {
                console.log(`[Frame ${frame.id}] Connection timeout after 30s, triggering reload`);
                toast.info('Connection slow, retrying...', {
                    description: `Reconnecting to ${currentBranchData?.branch?.name}...`,
                });
                handleConnectionFailed();
            }
        }, 30000);

        return () => clearTimeout(timeoutId);
    }, [isConnecting, frame.branchId]);

    // Immediate reload (for manual triggers via frameData.view.reload())
    const immediateReload = () => {
        console.log(`[Frame ${frame.id}] Immediate reload triggered`);
        setReloadKey(prev => prev + 1);
    };

    // Scheduled reload with linear backoff (for automatic retries)
    const scheduleReload = () => {
        reloadCountRef.current += 1;
        const reloadDelay = reloadBaseDelay + (reloadIncrement * (reloadCountRef.current - 1));

        console.log(
            `[Frame ${frame.id}] Scheduling iframe reload attempt ${reloadCountRef.current} in ${reloadDelay}ms`
        );

        setTimeout(() => {
            console.log(`[Frame ${frame.id}] Reloading iframe`);
            setReloadKey(prev => prev + 1);
        }, reloadDelay);
    };

    // Debounced handler for connection failures (prevents duplicate reloads)
    const handleConnectionFailed = debounce(scheduleReload, 1000, {
        leading: true,
    });

    // Reset reload count on successful connection
    useEffect(() => {
        if (isFrameReady && reloadCountRef.current > 0) {
            console.log(`[Frame ${frame.id}] Connection established, resetting reload counter`);
            reloadCountRef.current = 0;
        }
    }, [isFrameReady, frame.id]);

    return (
        <div
            className="flex flex-col fixed"
            style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
        >
            <RightClickMenu>
                <TopBar frame={frame} isInDragSelection={isInDragSelection} />
            </RightClickMenu>
            <div className="relative" style={{
                outline: isSelected ? `2px solid ${colors.teal[400]}` : isInDragSelection ? `2px solid ${colors.teal[500]}` : 'none',
                borderRadius: '4px',
            }}>
                <ResizeHandles frame={frame} setIsResizing={setIsResizing} />
                <FrameComponent
                    key={reloadKey}
                    frame={frame}
                    reloadIframe={immediateReload}
                    onConnectionFailed={handleConnectionFailed}
                    isInDragSelection={isInDragSelection}
                    ref={iFrameRef}
                />
                <GestureScreen frame={frame} isResizing={isResizing} />

                {!isFrameReady && (
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-md"
                        style={{ width: frame.dimension.width, height: frame.dimension.height }}
                    >
                        <div className="flex items-center gap-3 text-foreground" style={{ transform: `scale(${1 / editorEngine.canvas.scale})` }}>
                            <Icons.LoadingSpinner className="animate-spin h-8 w-8" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
```

### File: `view.tsx` (FrameComponent)

**This component is now simple - just handles Penpal connection:**
- Single connection attempt on iframe load
- Calls `onConnectionFailed()` on any error
- Calls `reloadIframe()` for the `reload()` method exposure
- No retry logic, no counters, no timers

```typescript
interface FrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: Frame;
    reloadIframe?: () => void;
    onConnectionFailed?: () => void;
    isInDragSelection?: boolean;
}

export const FrameComponent = observer(
    forwardRef<IFrameView, FrameViewProps>(({ frame, reloadIframe, onConnectionFailed, isInDragSelection = false, ...props }, ref) => {
        const editorEngine = useEditorEngine();
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const zoomLevel = useRef(1);
        const isConnecting = useRef(false);
        const connectionRef = useRef<ReturnType<typeof connect> | null>(null);
        const [penpalChild, setPenpalChild] = useState<PenpalChildMethods | null>(null);
        const isSelected = editorEngine.frames.isSelected(frame.id);
        const isActiveBranch = editorEngine.branches.activeBranch.id === frame.branchId;

        const setupPenpalConnection = () => {
            try {
                if (!iframeRef.current?.contentWindow) {
                    console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - No iframe found`);
                    onConnectionFailed?.();
                    return;
                }

                if (isConnecting.current) {
                    console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection already in progress`);
                    return;
                }
                isConnecting.current = true;

                // Destroy any existing connection
                if (connectionRef.current) {
                    connectionRef.current.destroy();
                    connectionRef.current = null;
                }

                const messenger = new WindowMessenger({
                    remoteWindow: iframeRef.current.contentWindow,
                    allowedOrigins: ['*'],
                });

                const connection = connect({
                    messenger,
                    methods: {
                        getFrameId: () => frame.id,
                        getBranchId: () => frame.branchId,
                        onWindowMutated: () => {
                            editorEngine.frameEvent.handleWindowMutated();
                        },
                        onWindowResized: () => {
                            editorEngine.frameEvent.handleWindowResized();
                        },
                        onDomProcessed: (data: { layerMap: Record<string, any>; rootNode: any }) => {
                            editorEngine.frameEvent.handleDomProcessed(frame.id, data);
                        },
                    } satisfies PenpalParentMethods,
                });

                connectionRef.current = connection;

                connection.promise
                    .then((child) => {
                        isConnecting.current = false;
                        if (!child) {
                            console.error(
                                `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection failed: child is null`,
                            );
                            onConnectionFailed?.();
                            return;
                        }

                        console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection established`);

                        const remote = child as unknown as PenpalChildMethods;
                        setPenpalChild(remote);
                        remote.setFrameId(frame.id);
                        remote.setBranchId(frame.branchId);
                        remote.handleBodyReady();
                        remote.processDom();
                    })
                    .catch((error) => {
                        isConnecting.current = false;
                        console.error(
                            `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection failed:`,
                            error,
                        );
                        onConnectionFailed?.();
                    });
            } catch (error) {
                isConnecting.current = false;
                console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Setup failed:`, error);
                onConnectionFailed?.();
            }
        };

        // ... promisifyMethod helper (unchanged)
        // ... remoteMethods useMemo (unchanged)
        // ... useImperativeHandle (unchanged, uses reloadIframe prop for reload() method)

        useEffect(() => {
            return () => {
                if (connectionRef.current) {
                    connectionRef.current.destroy();
                    connectionRef.current = null;
                }
                setPenpalChild(null);
                isConnecting.current = false;
            };
        }, []);

        return (
            <WebPreview>
                <WebPreviewBody
                    ref={iframeRef}
                    id={frame.id}
                    className={cn(
                        'backdrop-blur-sm transition outline outline-4',
                        isActiveBranch && 'outline-teal-400',
                        isActiveBranch && !isSelected && 'outline-dashed',
                        !isActiveBranch && isInDragSelection && 'outline-teal-500',
                    )}
                    src={frame.url}
                    sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                    allow="geolocation; microphone; camera; midi; encrypted-media"
                    style={{ width: frame.dimension.width, height: frame.dimension.height }}
                    onLoad={setupPenpalConnection}
                    {...props}
                />
            </WebPreview>
        );
    }),
);
```

## Key Design Decisions

### 1. All Logic in Parent (FrameView)

**Why:** Parent component doesn't remount, so it's the natural place for persistent state.

**Result:**
- `reloadCountRef` persists across iframe reloads
- Clean separation: parent = orchestration, child = presentation
- Single source of truth for reload behavior

### 2. No Penpal Retries

**Why:** Simpler, faster recovery. If Penpal fails, the webpage state might be bad anyway - fresh reload is better.

**Result:** Clean, predictable behavior. One attempt → reload on failure.

### 3. Linear Backoff

**Why:** Exponential grows too slow initially, too fast later. Linear is consistent and predictable.

**Pattern:** 2s, 3s, 4s, 5s, 6s...

### 4. Infinite Retries

**Why:** Network issues can be transient. Keep trying until user intervenes or connection succeeds.

**Safety:** Linear backoff prevents overwhelming the system.

### 5. Two Reload Paths

**`immediateReload()`:**
- For manual reloads via `frameData.view.reload()`
- Instant, no delay
- No counter increment

**`scheduleReload()` via `handleConnectionFailed()`:**
- For automatic retries
- Linear backoff applied
- Counter increments

## Benefits

✅ **Simple** - Single Penpal attempt, no complex retry state in child
✅ **Fast** - Immediate reload on failure, no waiting for retries
✅ **Predictable** - Linear backoff is easy to reason about
✅ **Resilient** - Infinite retries with reasonable delays
✅ **Maintainable** - All logic in one component (parent)
✅ **Debuggable** - Clear console logs at each step

## Edge Cases Handled

### A. Component Remounting
- **Problem:** Child remounts on reload, losing state
- **Solution:** Parent holds all state (persists across remounts)

### B. Multiple Failure Triggers
- **Problem:** Penpal fails + timeout fires → duplicate reloads
- **Solution:** `handleConnectionFailed` is debounced (1s)

### C. Successful Connection
- **Problem:** Counter keeps growing even after success
- **Solution:** `useEffect` resets `reloadCountRef` when `isFrameReady`

### D. Branch Switching
- **Problem:** Stale reload timers when switching branches
- **Solution:** Component remounts on branch change, timers cleaned via closure

## Testing Strategy

### Manual Testing Scenarios

1. **Slow network**
   - Throttle to 3G
   - Verify reload with increasing delays (2s, 3s, 4s...)

2. **Complete network failure**
   - Disconnect network
   - Verify continuous retry attempts

3. **Intermittent connection**
   - Toggle network on/off
   - Verify counter resets on success

4. **Manual reload**
   - Call `frameData.view.reload()`
   - Verify immediate reload, no backoff

5. **Branch switching**
   - Switch branches during retry
   - Verify clean state reset

## Implementation Checklist

### In `view.tsx`:
- [ ] Remove all retry logic (`retryCount`, `maxRetries`, `baseDelay`)
- [ ] Simplify `setupPenpalConnection` to single attempt
- [ ] Call `onConnectionFailed()` on any error
- [ ] Remove success counter reset (no counter in child anymore)
- [ ] Keep `reloadIframe` prop for `reload()` method exposure

### In `index.tsx`:
- [ ] Add `reloadCountRef` state
- [ ] Add `reloadBaseDelay` and `reloadIncrement` constants
- [ ] Add `immediateReload()` function
- [ ] Add `scheduleReload()` function with linear backoff
- [ ] Add `handleConnectionFailed` debounced callback
- [ ] Add reset logic on successful connection
- [ ] Pass `reloadIframe={immediateReload}` to child
- [ ] Pass `onConnectionFailed={handleConnectionFailed}` to child

## Console Output Example

```
[Frame abc123] Scheduling iframe reload attempt 1 in 2000ms
[Frame abc123] Reloading iframe
[Penpal Parent abc123] Connection failed: timeout
[Frame abc123] Scheduling iframe reload attempt 2 in 3000ms
[Frame abc123] Reloading iframe
[Penpal Parent abc123] Connection failed: timeout
[Frame abc123] Scheduling iframe reload attempt 3 in 4000ms
[Frame abc123] Reloading iframe
[Penpal Parent abc123] Connection established
[Frame abc123] Connection established, resetting reload counter
```

## References

- Current implementation: `/Users/kietho/workplace/onlook/clones/web-blue/apps/web/client/src/app/project/[id]/_components/canvas/frame/`
- Parent component: `index.tsx` (FrameView)
- Child component: `view.tsx` (FrameComponent)
- Frame manager: `/Users/kietho/workplace/onlook/clones/web-blue/apps/web/client/src/components/store/editor/frames/manager.ts`
