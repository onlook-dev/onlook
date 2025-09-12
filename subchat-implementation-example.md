# Subchat Implementation Usage Example

## Schema Overview

The subchat implementation adds two optional columns to the conversations table:
- `parentConversationId`: References the parent conversation (for subchats)
- `parentMessageId`: References the specific message that spawned this subchat

## Key Features

### 1. Create Subchat from Message
```typescript
// Create a subchat from a specific message
const subchat = await api.conversation.createSubchat({
  projectId: "project-123",
  parentConversationId: "conv-456", 
  parentMessageId: "msg-789",
  displayName: "Follow-up discussion"
});
```

### 2. Query Subchats
```typescript
// Get all subchats of a conversation
const subchats = await api.conversation.getSubchats({
  parentConversationId: "conv-456"
});

// Get only root conversations (no parent)
const rootConversations = await api.conversation.getRootConversations({
  projectId: "project-123"
});
```

### 3. Build Conversation Tree
```typescript
// Get full conversation tree with nested subchats
const tree = await api.conversation.getConversationTree({
  conversationId: "conv-456"
});
```

## Database Structure

### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  display_name VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  suggestions JSONB DEFAULT '[]',
  
  -- Subchat support
  parent_conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE
);

-- Indexes for efficient subchat queries
CREATE INDEX conversations_parent_conversation_idx ON conversations(parent_conversation_id);
CREATE INDEX conversations_parent_message_idx ON conversations(parent_message_id);
```

## Benefits

1. **Clean Separation**: Each subchat is an independent conversation with its own messages
2. **Flexible Hierarchy**: Unlimited nesting depth (subchats can have subchats)
3. **Efficient Queries**: Direct parent/child relationships with proper indexing
4. **Cascade Operations**: When parent is deleted, subchats are automatically removed
5. **Backward Compatible**: Existing conversations continue to work (parentConversationId = null)

## Example Workflow

1. User creates a main conversation about "Project Planning"
2. During discussion, user wants to dive deeper into "Budget Analysis" 
3. User clicks "Create Subchat" on a specific message about budgets
4. New subchat is created with parentConversationId and parentMessageId set
5. Subchat appears in conversation tree but can also be treated independently
6. User can create further subchats from the budget subchat for "Cost Estimates", etc.

## API Routes Available

- `conversation.createSubchat` - Create new subchat
- `conversation.getSubchats` - Get direct children of a conversation  
- `conversation.getRootConversations` - Get conversations without parents
- `conversation.getConversationTree` - Get full hierarchical tree
- All existing conversation routes continue to work unchanged