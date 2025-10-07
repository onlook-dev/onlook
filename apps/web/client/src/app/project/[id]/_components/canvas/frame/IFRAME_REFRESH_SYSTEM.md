# Iframe Refresh System with Exponential Backoff

## Overview

This document outlines the design for a robust iframe connection system that automatically handles Penpal connection failures with exponential backoff and progressive iframe reloads.

## Current State Analysis

### Existing Implementation

**File: `view.tsx:68-96`**
- Penpal connection retry with exponential backoff
- Max 3 retries with base delay 1000ms
- After max retries, triggers `reloadIframe()`

**File: `index.tsx:20-48`**
- 30-second timeout monitoring
- Shows error toast but doesn't trigger refresh
- User must manually reload

### Identified Gaps

1. ❌ No automatic iframe refresh after Penpal connection timeout
2. ❌ Disconnect between sandbox session state and Penpal connection state
3. ❌ No exponential backoff for iframe reloads themselves
4. ❌ User sees error toast but must manually reload
5. ❌ No recovery tracking across iframe reload cycles

## Proposed System Design

### 1. Connection State Management

Create a unified connection state tracker in `view.tsx`:

```typescript
interface ConnectionState {
  penpalRetries: number;           // Current Penpal retry count
  iframeReloadCount: number;       // Number of iframe reloads
  lastReloadTime: number;          // Timestamp of last reload
  connectionEstablished: boolean;  // Whether Penpal ever connected
}
```

### 2. Exponential Backoff Strategy

**Two-level retry system:**

1. **Penpal retries (inner loop):** 3 attempts with exponential backoff
   - Attempt 1: immediate
   - Attempt 2: 1s delay
   - Attempt 3: 2s delay
   - ✅ *Already implemented*

2. **Iframe reloads (outer loop):** 3 cycles with exponential backoff
   - Reload 1: 5s delay
   - Reload 2: 10s delay
   - Reload 3: 20s delay
   - ❌ *Needs implementation*

**Configuration:**
```typescript
const IFRAME_RELOAD_CONFIG = {
  maxReloads: 3,
  baseDelay: 5000,      // 5 seconds
  maxDelay: 20000,      // 20 seconds
  timeoutPerCycle: 30000, // 30 seconds per iframe load
};
```

**Total max attempts:** 12 connection attempts (3 Penpal × 3 iframe cycles + 3 initial) before giving up

### 3. Connection Flow Diagram

```
Iframe Load
    ↓
Penpal Connection Attempt 1 (immediate)
    ↓ fail (after 1s timeout)
Penpal Connection Attempt 2 (delay 1s)
    ↓ fail (after 2s timeout)
Penpal Connection Attempt 3 (delay 2s)
    ↓ fail (after 4s timeout)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iframe Reload 1 (delay 5s)
    ↓
Penpal Connection Attempt 1 (immediate)
    ↓ fail
Penpal Connection Attempt 2 (delay 1s)
    ↓ fail
Penpal Connection Attempt 3 (delay 2s)
    ↓ fail
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iframe Reload 2 (delay 10s)
    ↓
[Repeat Penpal attempts...]
    ↓ all fail
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iframe Reload 3 (delay 20s)
    ↓
[Repeat Penpal attempts...]
    ↓ all fail
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Show Fatal Error (manual intervention required)
```

### 4. Implementation Changes

#### A. Changes to `view.tsx`

##### 1. Add connection state ref (insert after line ~68)

```typescript
const connectionState = useRef<ConnectionState>({
  penpalRetries: 0,
  iframeReloadCount: 0,
  lastReloadTime: 0,
  connectionEstablished: false,
});

const IFRAME_RELOAD_CONFIG = {
  maxReloads: 3,
  baseDelay: 5000,
  maxDelay: 20000,
  timeoutPerCycle: 30000,
};
```

##### 2. Add new function `scheduleIframeReload` (insert before `retrySetupPenpalConnection`)

```typescript
const scheduleIframeReload = () => {
  const state = connectionState.current;

  if (state.iframeReloadCount >= IFRAME_RELOAD_CONFIG.maxReloads) {
    console.error(
      `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Max iframe reloads (${IFRAME_RELOAD_CONFIG.maxReloads}) reached, connection failed permanently`
    );
    // Notify parent component of fatal failure
    // This will be handled in index.tsx
    return;
  }

  state.iframeReloadCount++;
  const delay = Math.min(
    IFRAME_RELOAD_CONFIG.baseDelay * Math.pow(2, state.iframeReloadCount - 1),
    IFRAME_RELOAD_CONFIG.maxDelay
  );

  console.log(
    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Scheduling iframe reload ${state.iframeReloadCount}/${IFRAME_RELOAD_CONFIG.maxReloads} in ${delay}ms`
  );

  setTimeout(() => {
    state.lastReloadTime = Date.now();
    reloadIframe?.();
  }, delay);
};
```

##### 3. Update `retrySetupPenpalConnection` (modify existing function at line ~75)

```typescript
const retrySetupPenpalConnection = (error?: Error) => {
  if (retryCount.current >= maxRetries) {
    console.error(
      `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Max Penpal retries (${maxRetries}) reached, triggering iframe reload`,
      error,
    );
    retryCount.current = 0;

    // Trigger iframe reload with exponential backoff
    scheduleIframeReload();
    return;
  }

  retryCount.current += 1;
  const delay = baseDelay * Math.pow(2, retryCount.current - 1);

  console.log(
    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Retrying Penpal connection attempt ${retryCount.current}/${maxRetries} in ${delay}ms`,
  );

  setTimeout(() => {
    setupPenpalConnection();
  }, delay);
};
```

##### 4. Update success handler in `setupPenpalConnection` (modify line ~145)

```typescript
connection.promise
  .then((child) => {
    isConnecting.current = false;
    if (!child) {
      const error = new Error('Failed to setup penpal connection: child is null');
      console.error(
        `${PENPAL_PARENT_CHANNEL} (${frame.id}) - ${error.message}`,
      );
      retrySetupPenpalConnection(error);
      return;
    }

    // Reset all retry counts on successful connection
    retryCount.current = 0;
    connectionState.current.iframeReloadCount = 0;
    connectionState.current.connectionEstablished = true;

    console.log(
      `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection established successfully after ${connectionState.current.iframeReloadCount} iframe reloads`
    );

    const remote = child as unknown as PenpalChildMethods;
    setPenpalChild(remote);
    remote.setFrameId(frame.id);
    remote.setBranchId(frame.branchId);
    remote.handleBodyReady();
    remote.processDom();
    console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Penpal connection set `);
  })
  .catch((error) => {
    isConnecting.current = false;
    console.error(
      `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection:`,
      error,
    );
    retrySetupPenpalConnection(error);
  });
```

##### 5. Reset state on iframe reload (modify useEffect cleanup at line ~291)

```typescript
useEffect(() => {
  // Reset connection state when iframe reloads
  connectionState.current.penpalRetries = 0;

  return () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    setPenpalChild(null);
    isConnecting.current = false;
    // Keep iframeReloadCount for tracking across reloads
  };
}, [reloadKey]); // Add reloadKey dependency if passed from parent
```

#### B. Changes to `index.tsx`

##### 1. Add reload attempt tracking (insert after line ~19)

```typescript
const [reloadAttempts, setReloadAttempts] = useState(0);
const maxIframeReloads = 3;
```

##### 2. Update timeout logic to trigger auto-reload (modify line ~35-48)

```typescript
useEffect(() => {
  if (!isConnecting) {
    setHasTimedOut(false);
    return;
  }

  const timeoutId = setTimeout(() => {
    const currentBranchData = editorEngine.branches.getBranchDataById(frame.branchId);
    const stillConnecting = currentBranchData?.sandbox?.session?.isConnecting ?? false;

    if (stillConnecting) {
      console.log(
        `[Frame ${frame.id}] Penpal connection timeout after 30s, triggering reload (attempt ${reloadAttempts + 1}/${maxIframeReloads})`
      );

      if (reloadAttempts < maxIframeReloads) {
        setReloadAttempts(prev => prev + 1);

        // Show progressive feedback
        const message = getConnectionMessage(reloadAttempts + 1);
        if (message) {
          toast.info(message, {
            description: `Reconnecting to ${currentBranchData?.branch?.name}...`,
          });
        }

        // Trigger reload with exponential backoff
        const delay = Math.min(5000 * Math.pow(2, reloadAttempts), 20000);
        setTimeout(() => {
          reloadIframe();
        }, delay);
      } else {
        setHasTimedOut(true);
        toast.error('Connection failed', {
          description: `Could not connect to ${currentBranchData?.branch?.name}. Please try reloading manually.`,
          action: {
            label: 'Reload',
            onClick: () => {
              setReloadAttempts(0);
              reloadIframe();
            },
          },
        });
      }
    }
  }, 30000);

  return () => clearTimeout(timeoutId);
}, [isConnecting, frame.branchId, reloadAttempts]);
```

##### 3. Add helper function for progressive messages (insert before component)

```typescript
const getConnectionMessage = (reloadCount: number): string | null => {
  switch(reloadCount) {
    case 1: return 'Connection slow, retrying...';
    case 2: return 'Still connecting, please wait...';
    case 3: return 'Connection taking longer than expected...';
    default: return null;
  }
};
```

##### 4. Reset reload attempts on successful connection (add useEffect)

```typescript
useEffect(() => {
  // Reset reload attempts when connection succeeds
  if (isFrameReady && reloadAttempts > 0) {
    console.log(`[Frame ${frame.id}] Connection established, resetting reload attempts`);
    setReloadAttempts(0);
  }
}, [isFrameReady, frame.id]);
```

### 5. User Feedback Strategy

**Progressive messaging based on reload attempts:**

| Attempt | Delay | User Message |
|---------|-------|--------------|
| Initial Penpal retries (1-3) | 0s, 1s, 2s | Loading spinner, no message |
| Iframe Reload 1 | 5s | "Connection slow, retrying..." |
| Iframe Reload 2 | 10s | "Still connecting, please wait..." |
| Iframe Reload 3 | 20s | "Connection taking longer than expected..." |
| Fatal (all failed) | - | "Connection failed" + manual reload button |

**Toast implementation:**
```typescript
// Info toasts during retry
toast.info('Connection slow, retrying...', {
  description: `Reconnecting to ${branchName}...`,
});

// Error toast with action button
toast.error('Connection failed', {
  description: `Could not connect to ${branchName}. Please try reloading manually.`,
  action: {
    label: 'Reload',
    onClick: () => {
      setReloadAttempts(0);
      reloadIframe();
    },
  },
});
```

### 6. Recovery Mechanisms

1. **Manual reload button** - Available in fatal error state
2. **Reset on branch switch** - Clear all retry state when user switches branches
3. **Automatic cleanup** - Reset state on component unmount
4. **Success reset** - Reset all counters on successful connection

**Implementation:**
```typescript
// Reset on branch change
useEffect(() => {
  setReloadAttempts(0);
  setHasTimedOut(false);
}, [frame.branchId]);

// Reset on successful connection
useEffect(() => {
  if (isFrameReady && reloadAttempts > 0) {
    setReloadAttempts(0);
  }
}, [isFrameReady]);
```

### 7. Monitoring & Debugging

**Console logging structure:**
```typescript
// Penpal level
console.log(`[Frame ${frame.id}] Penpal attempt ${retryCount}/${maxRetries}`);
console.log(`[Frame ${frame.id}] Penpal connection failed: ${error.message}`);

// Iframe level
console.log(`[Frame ${frame.id}] Iframe reload ${reloadCount}/${maxReloads} scheduled in ${delay}ms`);
console.log(`[Frame ${frame.id}] Connection established after ${totalAttempts} attempts`);

// Fatal
console.error(`[Frame ${frame.id}] All connection attempts exhausted`);
```

**Telemetry points to track:**
- Connection attempt start/success/failure timestamps
- Iframe reload triggers and delays
- Total time to successful connection
- Failure reasons (timeout, error type, max retries)
- User manual reload triggers

### 8. Edge Cases & Considerations

#### A. Race Conditions
- **Problem:** Multiple reload timers active simultaneously
- **Solution:** Clear existing timers before scheduling new ones
```typescript
const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);

const scheduleIframeReload = () => {
  if (reloadTimerRef.current) {
    clearTimeout(reloadTimerRef.current);
  }
  reloadTimerRef.current = setTimeout(() => {
    reloadIframe();
  }, delay);
};
```

#### B. Component Unmount During Retry
- **Problem:** Timers firing after component unmounts
- **Solution:** Cleanup all timers in useEffect cleanup
```typescript
useEffect(() => {
  return () => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
    }
  };
}, []);
```

#### C. Rapid Branch Switching
- **Problem:** Stale retry state when switching branches quickly
- **Solution:** Reset all state on branch change
```typescript
useEffect(() => {
  setReloadAttempts(0);
  setHasTimedOut(false);
  if (reloadTimerRef.current) {
    clearTimeout(reloadTimerRef.current);
  }
}, [frame.branchId]);
```

#### D. Network Flapping
- **Problem:** Connection succeeds briefly then fails again
- **Solution:** Only reset counters after stable connection (e.g., 5s connected)
```typescript
useEffect(() => {
  if (!isFrameReady) return;

  const stabilityTimer = setTimeout(() => {
    console.log(`[Frame ${frame.id}] Connection stable, resetting retry state`);
    setReloadAttempts(0);
  }, 5000);

  return () => clearTimeout(stabilityTimer);
}, [isFrameReady]);
```

## Benefits

✅ **Automatic recovery** - No manual intervention needed for transient failures
✅ **Progressive backoff** - Prevents overwhelming the system with rapid retries
✅ **Clear limits** - Fails gracefully after reasonable attempts (12 total)
✅ **User awareness** - Progressive feedback shows system is working
✅ **Debuggable** - Comprehensive logging for troubleshooting
✅ **Resilient** - Handles both Penpal-level and iframe-level failures
✅ **User-friendly** - Manual recovery option always available

## Testing Strategy

### Manual Testing Scenarios

1. **Slow network simulation**
   - Throttle network to 3G
   - Verify progressive retries and eventual success

2. **Complete network failure**
   - Disconnect network entirely
   - Verify proper error handling and fatal error state

3. **Intermittent connection**
   - Toggle network on/off during retries
   - Verify state resets on success

4. **Branch switching during retry**
   - Switch branches while retries are in progress
   - Verify cleanup and state reset

5. **Rapid iframe reloads**
   - Manually trigger multiple reloads quickly
   - Verify no race conditions or duplicate retries

### Automated Testing (Future)

```typescript
describe('Iframe Refresh System', () => {
  it('should retry Penpal connection 3 times before iframe reload', () => {});
  it('should schedule iframe reload with exponential backoff', () => {});
  it('should reset counters on successful connection', () => {});
  it('should show fatal error after max attempts', () => {});
  it('should cleanup timers on unmount', () => {});
});
```

## Implementation Checklist

- [ ] Add `ConnectionState` interface and ref in `view.tsx`
- [ ] Implement `scheduleIframeReload` function in `view.tsx`
- [ ] Update `retrySetupPenpalConnection` to call `scheduleIframeReload`
- [ ] Update success handler to reset connection state
- [ ] Add reload attempt tracking in `index.tsx`
- [ ] Update timeout logic to trigger auto-reload
- [ ] Add progressive user feedback messages
- [ ] Implement manual reload button in fatal error
- [ ] Add state reset on branch change
- [ ] Add comprehensive logging
- [ ] Handle edge cases (race conditions, unmount, etc.)
- [ ] Manual testing across all scenarios
- [ ] Document final implementation

## References

- Current implementation: `/Users/kietho/workplace/onlook/clones/web-blue/apps/web/client/src/app/project/[id]/_components/canvas/frame/`
- Penpal connection: `view.tsx:98-180`
- Timeout handling: `index.tsx:29-48`
- Session manager: `/Users/kietho/workplace/onlook/clones/web-blue/apps/web/client/src/components/store/editor/sandbox/session.ts`
