feat: implement PostHog event triggers for user milestones and subscription tracking

Implements PostHog event triggers for user milestones and subscription status tracking as specified in GitHub issue #2415.

## Changes Made

### User Milestone Events ($set_once)
- **user_create_project**: Track first project creation with timestamp
- **user_import_project**: Track first project import completion  
- **user_start_app_builder**: Track first time opening project in builder
- **user_send_ai_message**: Track first AI chat message sent
- **user_publish_project**: Track first project publishing
- **user_map_custom_domain**: Track first custom domain mapping

### Subscription Status Events ($set)
- **subscription_event**: Track subscription activation/cancellation with active status

## Implementation Details

- Added PostHog imports and event captures at strategic completion points
- Client-side events for user interactions (create, import, chat, app start)
- Server-side events for webhooks and publishing operations
- All events follow existing PostHog patterns in the codebase
- Uses $set_once for milestones to track first occurrence with timestamps
- Uses $set for subscription status to track current state

## Files Modified

- apps/web/client/src/app/_components/hero/create.tsx
- apps/web/client/src/app/project/[id]/_components/right-panel/chat-tab/chat-input/index.tsx
- apps/web/client/src/app/project/[id]/_hooks/use-start-project.tsx
- apps/web/client/src/app/projects/import/local/_context/index.tsx
- apps/web/client/src/app/projects/import/github/_context/context.tsx
- apps/web/client/src/app/webhook/stripe/stripe.ts
- apps/web/client/src/server/api/routers/publish/helpers/publish.ts
- apps/web/client/src/server/api/routers/domain/verify/helpers/helpers.ts
- apps/web/client/src/server/api/routers/domain/verify/index.ts

## Testing

Events are triggered at the appropriate completion points:
- Project creation: After successful project creation
- Project import: After successful local/GitHub import
- App start: When project is ready and sandbox loaded
- AI message: When user sends first chat message
- Publishing: After successful deployment
- Custom domain: After successful domain verification
- Subscription: On Stripe webhook events

Link to Devin run: https://app.devin.ai/sessions/53f9c4916b874a769efa64fe0fa03165

Requested by: kiet@onlook.dev

Closes #2415
