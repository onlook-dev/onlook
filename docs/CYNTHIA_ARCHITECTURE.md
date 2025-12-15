# Cynthia Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CYNTHIA v3.0                                │
│                   AI Design Auditor & Refactor Engine                │
└─────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │    User     │
                              └──────┬──────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                  │
                    ▼                                  ▼
         ┌──────────────────┐              ┌──────────────────┐
         │   Audit Tab UI   │              │   AI Chat        │
         │   (React)        │              │   (Natural Lang) │
         └────────┬─────────┘              └────────┬─────────┘
                  │                                  │
                  │                                  │ uses tool
                  │                                  │
                  ▼                                  ▼
         ┌──────────────────────────────────────────────────┐
         │         tRPC API (apps/web/client/src/           │
         │             server/api/routers/cynthia/)         │
         │                                                   │
         │  • audit.create      • audit.getTeaser           │
         │  • audit.get         • audit.getFull             │
         │  • audit.list        • audit.updateStatus        │
         │                      • audit.saveResults         │
         └────────┬──────────────────────┬──────────────────┘
                  │                      │
                  │ creates              │ queries
                  ▼                      ▼
         ┌────────────────┐    ┌────────────────────┐
         │  Background    │    │   Database         │
         │  Processor     │───▶│   (Drizzle ORM)    │
         │  (async)       │    │                    │
         └────────┬───────┘    │ cynthia_audits     │
                  │            │   table            │
                  │            └────────────────────┘
                  │ triggers
                  ▼
         ┌─────────────────────────────────────────────┐
         │      Audit Engine                           │
         │      (packages/ai/src/audit/engine.ts)      │
         │                                             │
         │  1. Build prompt from input                 │
         │  2. Route to ReasonerTier model             │
         │  3. Generate structured output              │
         │  4. Validate with Zod schemas               │
         │  5. Transform to report format              │
         └────────┬────────────────────────────────────┘
                  │ calls
                  ▼
         ┌─────────────────────────────────────────────┐
         │      LLM Router (LightLLM)                  │
         │      (packages/models/src/cynthia/router)   │
         │                                             │
         │  Task → Model Mapping:                      │
         │  • UI_AUDIT_REASONING → Claude 4.5 Sonnet   │
         │  • MULTIMODAL_UNDERSTAND → GPT-5            │
         │  • CODE_REFACTOR → GPT-5                    │
         └────────┬────────────────────────────────────┘
                  │
                  ▼
         ┌─────────────────────────────────────────────┐
         │      AI Model (via AI SDK)                  │
         │                                             │
         │  System Prompt:                             │
         │  • CYNTHIA identity & principles            │
         │  • 13 UDEC axes definitions                 │
         │  • Severity levels & fix types              │
         │  • Output format (JSON schema)              │
         │  • Non-negotiables & standards              │
         └────────┬────────────────────────────────────┘
                  │
                  │ returns
                  ▼
         ┌─────────────────────────────────────────────┐
         │      Structured Report                      │
         │      (packages/models/src/cynthia/report)   │
         │                                             │
         │  • Overall Score (0-100)                    │
         │  • UDEC Scores (13 axes)                    │
         │  • Issues Found Total                       │
         │  • Teaser Issues (top 3-7)                  │
         │  • Full Issues (all)                        │
         │  • Fix Packs (grouped fixes)                │
         │  • Token Changes                            │
         │  • Patch Plan (reversible)                  │
         └─────────────────────────────────────────────┘
```

## Data Flow

### 1. Audit Creation Flow

```
User Input
    │
    ├─ URL: https://example.com
    ├─ Context: { productType, audience, goal }
    └─ Constraints: { brand, stack, timeline }
    │
    ▼
Create Audit (tRPC mutation)
    │
    ├─ Insert into database (status: PENDING)
    ├─ Return audit ID
    └─ Trigger background processor
    │
    ▼
Background Processor
    │
    ├─ Update status → RUNNING
    ├─ Build AuditInput object
    └─ Call audit engine
    │
    ▼
Audit Engine
    │
    ├─ Build prompt with context
    ├─ Route to Claude Sonnet 4.5
    ├─ Generate structured JSON
    └─ Validate with Zod
    │
    ▼
Save Results
    │
    ├─ Update status → COMPLETED
    ├─ Save scores, issues, fix packs
    └─ Set completedAt timestamp
    │
    ▼
UI Polling (every 2 seconds)
    │
    ├─ Check status
    └─ Display results when completed
```

### 2. AI Chat Integration Flow

```
User: "Audit my UI"
    │
    ▼
AI Agent (chat system)
    │
    ├─ Understands intent
    ├─ Selects cynthia_audit tool
    └─ Determines parameters
    │
    ▼
CynthiaAuditTool.handle()
    │
    ├─ Get project ID from editor
    ├─ Get current frame URL
    ├─ Build audit request
    └─ Call tRPC audit.create
    │
    ▼
[Same flow as above]
```

## Component Hierarchy

### UI Layer

```
AuditTab
│
├── New Audit Form
│   ├── URL Input
│   └── Run Button
│
├── Status Card (if audit exists)
│   ├── Status Badge
│   ├── Progress Indicator
│   └── Error Display
│
├── Score Card (if completed)
│   ├── Overall Score (large)
│   └── Issues Count
│
├── Issues List (teaser)
│   └── Issue Card (repeat)
│       ├── Severity Badge
│       ├── Axis Badge
│       ├── Title
│       ├── Description
│       ├── Reason
│       ├── Impact
│       └── Fix Details
│
└── Unlock Card (paywall)
    ├── Feature List
    └── Upgrade Button
```

## Type System

### Core Types Hierarchy

```
┌─────────────────────────────────────┐
│         AuditInput                  │
│  • target: AuditTarget              │
│  • context?: AuditContext           │
│  • constraints?: AuditConstraints   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         CynthiaReport               │
│  • overallScore: number             │
│  • udecScores: UDECScores           │
│  • teaserIssues: DesignIssue[]      │
│  • fullIssues?: DesignIssue[]       │
│  • fixPacks?: FixPack[]             │
│  • tokenChanges?: TokenChange[]     │
│  • patchPlan?: PatchPlan            │
└─────────────┬───────────────────────┘
              │
              ├─────────────────┐
              │                 │
              ▼                 ▼
    ┌─────────────────┐  ┌──────────────┐
    │  DesignIssue    │  │   FixPack    │
    │  • axis         │  │   • category │
    │  • severity     │  │   • issues[] │
    │  • title        │  │   • impact   │
    │  • fix          │  │   • tradeoffs│
    └─────────┬───────┘  └──────────────┘
              │
              ▼
    ┌─────────────────┐
    │    IssueFix     │
    │  • type         │
    │  • description  │
    │  • measurements │
    │  • before/after │
    └─────────────────┘
```

## Database Schema

```sql
CREATE TABLE cynthia_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status audit_status DEFAULT 'pending' NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_value TEXT NOT NULL,
    context JSONB,
    constraints JSONB,
    overall_score INTEGER,
    udec_scores JSONB,
    issues_found_total INTEGER,
    teaser_issues JSONB,
    full_issues JSONB,
    fix_packs JSONB,
    token_changes JSONB,
    patch_plan JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_audits_project ON cynthia_audits(project_id);
CREATE INDEX idx_audits_user ON cynthia_audits(user_id);
CREATE INDEX idx_audits_status ON cynthia_audits(status);

-- Row Level Security
ALTER TABLE cynthia_audits ENABLE ROW LEVEL SECURITY;
```

## API Endpoints

### tRPC Router: `api.audit.*`

```typescript
audit.create({
  projectId: string,
  targetType: 'url' | 'screenshot' | 'frame' | 'component',
  targetValue: string,
  context?: { productType, audience, goal },
  constraints?: { brand, stack, timeline }
}) → Audit

audit.get({ id: string }) → Audit

audit.list({ projectId: string }) → Audit[]

audit.getTeaser({ id: string }) → {
  id, status, overallScore,
  udecScores, issuesFoundTotal,
  teaserIssues, createdAt, completedAt
}

audit.getFull({ id: string }) → Audit (with subscription check)

audit.updateStatus({ id, status, errorMessage? }) → Audit

audit.saveResults({
  id, overallScore, udecScores,
  issuesFoundTotal, teaserIssues,
  fullIssues, fixPacks?, tokenChanges?,
  patchPlan?
}) → Audit
```

## State Machine

### Audit Status Transitions

```
┌─────────┐
│ PENDING │─────┐
└─────────┘     │
                │ start processing
                ▼
         ┌─────────────┐
         │   RUNNING   │
         └─────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌─────────────┐  ┌─────────────┐
│  COMPLETED  │  │   FAILED    │
└─────────────┘  └─────────────┘
```

## Security Model

```
┌─────────────────────────────────────┐
│     Row Level Security (RLS)        │
│                                     │
│  User can only:                     │
│  • Create audits for their projects │
│  • View their own audits            │
│  • Update their own audits          │
│                                     │
│  Cascade on delete:                 │
│  • Delete project → delete audits   │
│  • Delete user → delete audits      │
└─────────────────────────────────────┘
```

## Model Selection Logic

```typescript
function selectModel(task: TaskRoute): ModelTier {
  switch (task) {
    case TaskRoute.UI_AUDIT_REASONING:
      return {
        model: OPENROUTER_MODELS.CLAUDE_4_5_SONNET,
        provider: LLMProvider.OPENROUTER,
        description: 'Best for UDEC scoring + design critique'
      };
    
    case TaskRoute.MULTIMODAL_UNDERSTAND:
      return {
        model: OPENROUTER_MODELS.OPEN_AI_GPT_5,
        provider: LLMProvider.OPENROUTER,
        description: 'Screenshot understanding, layout detection'
      };
    
    // ... other routes
  }
}
```

## Error Handling

```
Try: Run Audit
│
├─ Input Validation Error
│  └─ Return: { success: false, message: "Invalid input" }
│
├─ AI Model Error (429, 5xx)
│  ├─ Retry with backoff
│  └─ Fallback to BackupTier model
│
├─ Parsing Error
│  ├─ Attempt repair with repair_tool_call
│  └─ Use GPT-5-NANO to fix JSON
│
└─ Database Error
   ├─ Log error details
   ├─ Set status to FAILED
   └─ Store error message
```

## Performance Characteristics

### Current Implementation

| Metric | Value | Notes |
|--------|-------|-------|
| Avg Audit Duration | ~30-60s | Depends on model response time |
| UI Polling Interval | 2s | Real-time feeling |
| Concurrent Audits | Unlimited | No job queue yet |
| Database Queries | ~3-5 | Per audit lifecycle |
| Model Tokens | ~2000-5000 | Varies by complexity |

### Scaling Considerations

```
Current: Direct execution in API handler
         → Fast but blocks
         
Production: Job queue (BullMQ/Inngest)
           → Non-blocking, scalable
           → Retry policies
           → Rate limiting
           → Priority queues
```

## Monitoring Points

```
1. Audit Creation
   └─ Track: Project ID, User ID, Target Type
   
2. Background Processing
   └─ Track: Duration, Status, Errors
   
3. AI Model Calls
   └─ Track: Tokens, Latency, Errors
   
4. Database Operations
   └─ Track: Query time, Errors
   
5. User Actions
   └─ Track: Upgrades, Audit views
```

## Future Architecture Evolution

```
Phase 1 (Current): ✅ COMPLETE
├─ Direct tRPC → Engine → Model
├─ Polling for updates
└─ Single model routing

Phase 2 (Next): 🔮 FUTURE
├─ Job queue integration
├─ Webhook notifications
├─ Multi-model orchestration
└─ Caching layer

Phase 3 (Advanced): 🔮 FUTURE
├─ Real-time streaming results
├─ Incremental audits
├─ Distributed processing
└─ ML-based optimization
```

---

This architecture supports:
- ✅ Scalability (job queue ready)
- ✅ Type safety (end-to-end TypeScript)
- ✅ Security (RLS, ownership checks)
- ✅ Observability (logging points)
- ✅ Extensibility (plugin-based models)
- ✅ User experience (real-time updates)
