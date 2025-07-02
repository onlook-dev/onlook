# Server-Side Publish Migration

## Overview

The publish functionality has been moved from the client-side to the server-side to improve security, performance, and reliability. The new implementation uses a polling-based approach to provide real-time progress updates to the client.

## Architecture Changes

### Before (Client-Side)
- Publishing logic ran entirely in the browser
- Direct file system access through the sandbox
- Build commands executed via sandbox session
- File serialization happened client-side
- Large file transfers from client to server

### After (Server-Side)
- Publishing logic runs on the server
- Server has direct file system access
- Build commands executed via Node.js child processes
- File serialization happens server-side
- Only publish parameters sent from client
- Real-time progress updates via polling

## Key Components

### 1. Server-Side Publish Router (`apps/web/client/src/server/api/routers/domain/publish.ts`)

The new publish router provides two main endpoints:

- `startPublish`: Initiates the publish process and returns a unique `publishId`
- `getPublishState`: Returns the current state of a publish process

### 2. Updated Client-Side Hosting Manager (`apps/web/client/src/components/store/editor/hosting/index.ts`)

The hosting manager now:
- Calls the server-side endpoint to start publishing
- Polls for progress updates using the `publishId`
- Updates the local state based on server responses
- Maintains backward compatibility with existing UI components

## API Usage

### Starting a Publish

```typescript
const { publishId } = await api.domain.publish.startPublish.mutate({
    type: 'preview', // or 'custom'
    projectId: 'project-uuid',
    projectPath: '/absolute/path/to/project',
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
});
```

### Polling for Progress

```typescript
const state = await api.domain.publish.getPublishState.query({ 
    publishId: 'project-uuid-1234567890' 
});

// State includes:
// - status: PublishStatus (LOADING, PUBLISHED, ERROR, etc.)
// - message: string | null
// - progress: number | null (0-100)
// - buildLog: string | null
// - error: string | null
```

## Implementation Details

### Progress Tracking

The server tracks progress through different stages:
1. **Preparing project** (5%): Setting up build configuration
2. **Adding badge** (10%): Injecting "Built with Onlook" badge
3. **Building** (20-60%): Running the build script
4. **Post-processing** (60-80%): Preparing files for deployment
5. **Deploying** (80-90%): Uploading to hosting provider
6. **Cleanup** (90-100%): Removing temporary files

### State Management

- States are stored in memory on the server (can be upgraded to Redis)
- Completed states are automatically cleaned up after 5 minutes
- Each publish process has a unique ID for tracking

### Error Handling

- Build errors are captured and returned in the state
- Timeout protection (10 minutes default)
- Graceful cleanup on failure

## Client-Side Example

```typescript
// In your React component
const editorEngine = useEditorEngine();

// The hosting manager handles all the complexity
const response = await editorEngine.hosting.publishPreview(
    projectId,
    {
        buildScript: 'npm run build',
        urls: ['example.onlook.dev'],
        options: {
            skipBadge: false,
            buildFlags: '',
            skipBuild: false,
        }
    }
);

// The state is automatically updated during the process
// Access via: editorEngine.hosting.state
```

## Benefits

1. **Security**: Build processes run in a controlled server environment
2. **Performance**: No large file transfers from client to server
3. **Reliability**: Server has better resources for building projects
4. **Scalability**: Can easily add job queues or distribute builds
5. **Monitoring**: Centralized logging and error tracking

## Migration Notes

- The client API remains mostly unchanged for backward compatibility
- Existing UI components continue to work without modification
- The polling interval is set to 1 second for responsive updates
- Consider implementing WebSockets for real-time updates in the future

## Future Enhancements

1. **Redis Integration**: Store publish states in Redis for distributed systems
2. **WebSocket Support**: Replace polling with real-time WebSocket updates
3. **Build Caching**: Cache build outputs for faster re-deployments
4. **Queue System**: Implement a job queue for handling multiple builds
5. **Build Logs Streaming**: Stream build logs in real-time instead of batch updates