# Pending Queue Implementation Plan

## Objective
Allow users to type messages while AI is streaming so they can:
1. Feel productive and engaged during wait times
2. Break up conversations into smaller, focused messages
3. Think out loud and queue multiple related thoughts

## Current State Analysis

### Existing Message Flow
1. User calls `sendMessage()` or `editMessage()`
2. Message immediately added to chat via `setMessages()`
3. AI processing starts via `regenerate()`
4. Tool calls execute asynchronously
5. Chat completes and triggers cleanup actions

### Current Limitations
- Users can't queue messages during streaming
- No visual feedback for pending messages
- No way to remove queued messages
- Unclear what happens when user stops AI mid-stream

## Proposed Queue Architecture

### 1. Simplified Queue State

```typescript
import type { MessageContext } from '@onlook/models/chat';

interface QueuedMessage {
  id: string;                    // uuidv4() from existing uuid package
  content: string;               // User's message text
  type: ChatType;                // Chat type
  timestamp: Date;               // When queued
  context: MessageContext[];     // Chat context at time of queueing
}

// Simple state additions to useChat hook
const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
```

### 2. Core Queue Functions

```typescript
// Import existing UUID function and types
import { v4 as uuidv4 } from 'uuid';
import type { MessageContext } from '@onlook/models/chat';

// Simple queue operations
const removeFromQueue = (id: string) => {
  setQueuedMessages(prev => prev.filter(msg => msg.id !== id));
};

const clearQueue = () => {
  setQueuedMessages([]);
};

const processNextInQueue = async () => {
  if (queuedMessages.length === 0) return;
  
  const [nextMessage, ...remaining] = queuedMessages;
  setQueuedMessages(remaining);
  
  // Refresh context before sending - takes and returns MessageContext[]
  const refreshedContext: MessageContext[] = await editorEngine.chat.context.getRefreshedContext(nextMessage.context);
  
  await sendMessageImmediately(nextMessage.content, nextMessage.type, refreshedContext);
};

// Helper functions - same behavior as current sendMessage/editMessage
const sendMessageImmediately = async (content: string, type: ChatType, context?: MessageContext[]) => {
  // This is the current sendMessage logic - unchanged behavior
  const messageContext = context || await editorEngine.chat.context.getContextByChatType(type);
  const newMessage = getUserChatMessageFromString(content, messageContext, conversationId);
  setMessages(jsonClone([...messagesRef.current, newMessage]));

  void regenerate({
    body: {
      chatType: type,
      conversationId,
      context: messageContext,
      agentType,
    },
  });
  void editorEngine.chat.conversation.generateTitle(content);
  return newMessage;
};

const editMessageImmediately = async (messageId: string, newContent: string, chatType: ChatType, context?: MessageContext[]) => {
  // This is the current editMessage logic - unchanged behavior
  const messageIndex = messagesRef.current.findIndex((m) => m.id === messageId);
  const message = messagesRef.current[messageIndex];

  if (messageIndex === -1 || !message || message.role !== 'user') {
    throw new Error('Message not found.');
  }

  const updatedMessages = messagesRef.current.slice(0, messageIndex);
  const previousContext = message.metadata?.context ?? [];
  const updatedContext = context || await editorEngine.chat.context.getRefreshedContext(previousContext);

  message.metadata = {
    ...message.metadata,
    context: updatedContext,
    conversationId,
    createdAt: message.metadata?.createdAt ?? new Date(),
    checkpoints: message.metadata?.checkpoints ?? [],
  };
  message.parts = [{ type: 'text', text: newContent }];

  setMessages(jsonClone([...updatedMessages, message]));

  void regenerate({
    body: {
      chatType,
      conversationId,
      agentType,
    },
  });

  return message;
};
```

### 3. Integration with Existing Chat Flow

#### Modified sendMessage Function
```typescript
const sendMessage: SendMessage = useCallback(
  async (content: string, type: ChatType) => {
    // If AI is streaming, add to queue instead
    if (isStreaming) {
      await addToQueue(content, type);
      return getUserChatMessageFromString(content, [], conversationId); // Return placeholder
    }
    
    // Send immediately if not streaming
    return sendMessageImmediately(content, type);
  },
  [isStreaming, addToQueue]
);

// Modified sendMessage to handle running vs stopped states
const sendMessage: SendMessage = useCallback(
  async (content: string, type: ChatType) => {
    // Get context for the message
    const context: MessageContext[] = await editorEngine.chat.context.getContextByChatType(type);
    
    const newMessage: QueuedMessage = {
      id: uuidv4(),
      content,
      type,
      timestamp: new Date(),
      context
    };
    
    if (isStreaming) {
      // AI is running - add to bottom of queue (normal queueing)
      setQueuedMessages(prev => [...prev, newMessage]);
    } else if (queuedMessages.length > 0) {
      // AI is stopped but there are queued messages - add to top of queue (priority)
      setQueuedMessages(prev => [newMessage, ...prev]);
    } else {
      // No queue and not streaming - send immediately
      return sendMessageImmediately(content, type);
    }
    
    return getUserChatMessageFromString(content, [], conversationId);
  },
  [isStreaming, queuedMessages.length]
);
```

#### editMessage Streaming Logic with Immediate Processing
```typescript
const editMessage: EditMessage = useCallback(
  async (messageId: string, newContent: string, chatType: ChatType) => {
    if (isStreaming) {
      // Stop current streaming immediately
      stop();
      
      // Process edit with immediate priority (higher than queue)
      const context: MessageContext[] = await editorEngine.chat.context.getContextByChatType(chatType);
      await editMessageImmediately(messageId, newContent, chatType, context);
      
      // Queue remains intact and will auto-process when streaming ends
      return;
    }
    
    // Normal edit processing when not streaming
    const context: MessageContext[] = await editorEngine.chat.context.getContextByChatType(chatType);
    return editMessageImmediately(messageId, newContent, chatType, context);
  },
  [isStreaming, stop]
);
```

#### Auto-process Queue When Streaming Ends
```typescript
useEffect(() => {
  // When streaming ends, process the next message in queue
  if (!isStreaming && queuedMessages.length > 0) {
    const timer = setTimeout(processNextInQueue, 500); // Small delay
    return () => clearTimeout(timer);
  }
}, [isStreaming, queuedMessages.length]);
```


### 5. UI Design Components (Using @onlook/ui)

```typescript
import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
import { Card } from '@onlook/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
```

#### Expandable Queue Box
```typescript
const QueueBox = ({ queuedMessages, removeFromQueue }) => {
  // Local state for UI expansion - not passed as props
  const [queueExpanded, setQueueExpanded] = useState(false);
  
  if (queuedMessages.length === 0) return null;
  
  return (
    <Card className="queue-container border-border/50 bg-background/95 backdrop-blur">
      <Collapsible open={queueExpanded} onOpenChange={setQueueExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-3 h-auto hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {queuedMessages.length}
              </Badge>
              <span className="text-sm">
                message{queuedMessages.length > 1 ? 's' : ''} queued
              </span>
            </div>
            <Icons.ChevronDown 
              className={`h-4 w-4 transition-transform ${queueExpanded ? 'rotate-180' : ''}`}
            />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="border-t border-border/50">
          <div className="p-3 space-y-2">
            {queuedMessages.map((message, index) => (
              <QueuedMessageItem 
                key={message.id} 
                message={message} 
                index={index} 
                removeFromQueue={removeFromQueue}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
```

#### Individual Queued Message Item  
```typescript
const QueuedMessageItem = ({ message, index }: { message: QueuedMessage, index: number }) => {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md border border-border/50 bg-card/50">
      <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
        #{index + 1}
      </Badge>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 line-clamp-2 break-words">
          {message.content}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
      
      <div className="flex gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removeFromQueue(message.id)}
            >
              <Icons.Trash className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove from queue</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
```
#### Layout Structure & Integration
```
Chat Messages
    ↓
Chat Input Component
  ├─ Expandable Queue Box (NEW - insert here)  
  ├─ InputContextPills (existing)
  ├─ Textarea (existing)
  ├─ ChatContextWindow (existing)
  └─ ActionButtons (existing)
```

#### ChatInput Component Integration
```typescript
// In /apps/web/client/src/app/project/[id]/_components/right-panel/chat-tab/chat-input/index.tsx

interface ChatInputProps {
    messages: ChatMessage[];
    suggestions: ChatSuggestion[];
    isStreaming: boolean;
    onStop: () => Promise<void>;
    onSendMessage: SendMessage;
    
    // NEW: Add queue props
    queuedMessages: QueuedMessage[];
    removeFromQueue: (id: string) => void;
}

// Component structure update:
<div className="flex flex-col w-full p-4">
    {/* NEW: Queue box goes here - above everything else */}
    {queuedMessages.length > 0 && (
        <QueueBox 
            queuedMessages={queuedMessages}
            removeFromQueue={removeFromQueue}
        />
    )}
    
    <InputContextPills />
    
    <Textarea
        ref={textareaRef}
        // ... existing textarea props
    />
</div>
```

### 6. Updated Hook Return Interface

```typescript
// Updated return type for useChat
return {
  // Existing returns
  status,
  sendMessage,
  editMessage,
  messages,
  error,
  stop,
  isStreaming,
  suggestions,
  
  // New simple queue returns
  queuedMessages,
  
  // Queue management functions
  removeFromQueue,
};
```

## Implementation Phases

### Phase 1: Refactor Existing Functions (No Behavior Changes)
1. Extract current `sendMessage` logic into `sendMessageImmediately` helper
2. Extract current `editMessage` logic into `editMessageImmediately` helper
3. Update existing functions to call helpers (same behavior, cleaner structure)
4. Verify all existing functionality works unchanged

### Phase 2: Core Queue Functionality (MVP)
1. Add simple queue state (`queuedMessages`)
2. Implement basic queue function (`removeFromQueue`)
3. Modify `sendMessage` to queue when streaming (bottom) vs stopped (top)
4. Add `editMessage` streaming logic with immediate processing
5. Auto-process queue when streaming ends

### Phase 3: UI Components  
1. Create expandable queue box component (no clear all button)
2. Add individual message items with remove buttons only
3. Integrate queue box into chat input component (above textarea, below context pills)

## Testing Strategy

### Unit Tests
- Queue management functions (enqueue, dequeue, remove)
- Error handling and retry logic
- Message priority sorting
- Edge cases (empty queue, full queue, concurrent operations)

### Integration Tests  
- Queue integration with existing chat flow
- Multiple rapid message sending
- Error recovery scenarios
- UI interaction testing

### User Experience Tests
- Queue behavior during streaming
- Message ordering correctness
- Retry mechanism reliability
- Performance with large queue sizes

## Migration Considerations

### Backwards Compatibility
- Existing chat functionality must remain unchanged
- Queue features are additive, not replacing existing behavior
- Graceful degradation if queue features fail

### Performance Impact
- Queue operations should be O(1) or O(log n) where possible
- Memory usage monitoring for large queues
- UI rendering optimization for queue status updates

### Data Persistence
- Consider localStorage persistence for queue across page refreshes
- Queue state recovery after browser crashes
- Message deduplication across sessions

## Success Metrics

### Functionality
- Zero message loss during streaming periods
- Successful retry of failed messages
- Intuitive user control over pending messages
- Stable queue processing without race conditions

### Performance
- Queue operations complete in <10ms
- UI updates smooth with queues up to 100 messages  
- Memory usage remains stable over long sessions
- No impact on existing chat response times

### User Experience
- Clear visual feedback for queue status
- Easy message removal and queue management
- Predictable message ordering
- Minimal learning curve for existing users