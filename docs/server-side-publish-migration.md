# Server-Side Publish with tRPC Subscriptions

## Overview

The publish functionality has been moved from the client-side to the server-side with real-time progress updates via tRPC subscriptions. This provides a more robust, secure, and performant deployment process with live feedback.

## Architecture Changes

### Before (Client-Side)
- Publishing logic ran entirely in the browser
- Direct file system access through the sandbox
- Build commands executed via sandbox session
- File serialization happened client-side
- Large file transfers from client to server

### After (Server-Side with Subscriptions)
- Publishing logic runs on the server
- Server has direct file system access
- Build commands executed via Node.js child processes
- File serialization happens server-side
- Only publish parameters sent from client
- **Real-time progress updates via tRPC subscriptions**
- Live build log streaming

## Key Components

### 1. Server-Side Publish Router (`apps/web/client/src/server/api/routers/domain/publish.ts`)

The publish router provides a subscription endpoint that streams real-time updates:

```typescript
publishRouter.publish.subscribe({
    type: 'preview',
    projectId: 'uuid',
    projectPath: '/path/to/project',
    request: {
        buildScript: 'npm run build',
        urls: ['example.onlook.dev'],
        options: { ... }
    }
})
```

### 2. Updated Client-Side Hosting Manager (`apps/web/client/src/components/store/editor/hosting/index.ts`)

The hosting manager now:
- Uses tRPC subscriptions for real-time updates
- Automatically updates the local state as deployment progresses
- Handles connection errors gracefully
- Maintains backward compatibility with existing UI components

## API Usage

### Server-Side Subscription

The server uses an `observable` to emit state updates:

```typescript
export const publishRouter = createTRPCRouter({
    publish: protectedProcedure
        .input(publishSchema)
        .subscription(({ ctx, input }) => {
            return observable<PublishState>((emit) => {
                // Emit initial state
                emit.next({ status: 'loading', progress: 0 });
                
                // Start async process
                publishAsync(...).then(() => {
                    // Cleanup on completion
                });
                
                // Return cleanup function
                return () => {
                    // Unsubscribe logic
                };
            });
        }),
});
```

### Client-Side Usage

```typescript
// Subscribe to deployment progress
const subscription = api.domain.publish.publish.subscribe(
    {
        type: 'preview',
        projectId: 'project-uuid',
        projectPath: '/path/to/project',
        request: {
            buildScript: 'npm run build',
            urls: ['example.onlook.dev'],
            options: {
                skipBadge: false,
                buildFlags: '--no-lint',
                skipBuild: false,
                envVars: {
                    NODE_ENV: 'production'
                }
            }
        }
    },
    {
        onData: (state: PublishState) => {
            console.log('Progress:', state.progress);
            console.log('Message:', state.message);
            console.log('Build log:', state.buildLog);
        },
        onError: (error) => {
            console.error('Subscription error:', error);
        }
    }
);

// Clean up when done
subscription.unsubscribe();
```

## Real-Time Features

### Live Progress Updates

The subscription emits state updates throughout the deployment process:

1. **Preparing project** (5%): Setting up build configuration
2. **Adding badge** (10%): Injecting "Built with Onlook" badge
3. **Building** (20-60%): Running the build script with live output
4. **Post-processing** (60-80%): Preparing files for deployment
5. **Deploying** (80-90%): Uploading to hosting provider
6. **Cleanup** (90-100%): Removing temporary files

### Build Log Streaming

Build output is streamed in real-time:

```typescript
child.stdout?.on('data', (data) => {
    buildOutput += data.toString();
    updateState({ buildLog: buildOutput });
});
```

## Implementation Details

### Event-Driven Architecture

The server uses Node.js EventEmitter to broadcast state updates:

```typescript
const publishEvents = new EventEmitter();

// Emit updates
publishEvents.emit(publishId, newState);

// Subscribe to updates
publishEvents.on(publishId, (state) => {
    emit.next(state);
});
```

### Error Handling

- Build errors are captured and streamed to the client
- Connection errors trigger the `onError` callback
- Graceful cleanup on failure or success
- Automatic cleanup of completed states after 5 minutes

## React Component Example

```typescript
import { api } from '@/trpc/react';
import { PublishStatus } from '@onlook/models';
import { Progress } from '@onlook/ui/progress';
import { useEffect, useState } from 'react';

function PublishButton({ projectId, projectPath }) {
    const [isPublishing, setIsPublishing] = useState(false);
    const [state, setState] = useState<PublishState | null>(null);

    const handlePublish = () => {
        setIsPublishing(true);
        
        const subscription = api.domain.publish.publish.subscribe(
            {
                type: 'preview',
                projectId,
                projectPath,
                request: {
                    buildScript: 'npm run build',
                    urls: ['example.onlook.dev']
                }
            },
            {
                onData: (newState) => {
                    setState(newState);
                    
                    if (newState.status === PublishStatus.PUBLISHED) {
                        setIsPublishing(false);
                        // Success!
                    } else if (newState.status === PublishStatus.ERROR) {
                        setIsPublishing(false);
                        // Handle error
                    }
                },
                onError: (error) => {
                    setIsPublishing(false);
                    console.error('Failed to publish:', error);
                }
            }
        );

        // Clean up on unmount
        return () => {
            subscription.unsubscribe();
        };
    };

    return (
        <div>
            <button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? 'Publishing...' : 'Publish'}
            </button>
            
            {state && (
                <>
                    <p>{state.message}</p>
                    <Progress value={state.progress || 0} />
                    {state.buildLog && (
                        <pre>{state.buildLog}</pre>
                    )}
                </>
            )}
        </div>
    );
}
```

## Benefits Over Polling

1. **Real-time Updates**: No delay between state changes and UI updates
2. **Efficiency**: No wasted requests when nothing has changed
3. **Automatic Cleanup**: Subscription automatically closes when done
4. **Build Log Streaming**: See build output as it happens
5. **Better Error Handling**: Connection errors are handled separately

## Migration Notes

- The client API remains mostly unchanged for backward compatibility
- Existing UI components continue to work without modification
- The subscription automatically handles connection management
- Falls back gracefully if connection is lost

## Technical Considerations

### Server-Sent Events (SSE)

Since Next.js App Router doesn't support WebSockets directly, the implementation uses:
- tRPC's observable pattern
- Server-Sent Events for the transport layer
- EventEmitter for internal state management

### Memory Management

- States are stored in memory (can be upgraded to Redis)
- Automatic cleanup after 5 minutes
- Event listeners are properly removed to prevent memory leaks

## Future Enhancements

1. **WebSocket Support**: When Next.js adds WebSocket support
2. **Redis Integration**: For distributed deployments
3. **Multiple Build Targets**: Deploy to multiple environments
4. **Deployment Queuing**: Handle concurrent deployments
5. **Build Caching**: Cache successful builds for faster re-deployments