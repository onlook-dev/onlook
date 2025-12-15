# Cynthia - AI Design Auditor & Refactor Engine

## Overview

Cynthia v3.0 is an autonomous design auditor and refactor engine embedded in Onlook. It audits UI like a credit bureau and refactors it into lovable, conversion-ready interfaces—directly in your codebase.

**Tagline:** _One click. Full audit. Full fix. Your UI stops embarrassing you._

## Features

### 🎯 UDEC Scoring System

Cynthia evaluates UI across 13 design axes, each scored 0-100:

- **CTX** (Context & Clarity) - Is the purpose immediately clear?
- **DYN** (Dynamic & Responsive) - Does it adapt well?
- **LFT** (Layout & Flow) - Does the eye move naturally?
- **TYP** (Typography) - Is text readable and hierarchical?
- **CLR** (Color) - Do colors serve purpose and accessibility?
- **GRD** (Grid & Spacing) - Is structure consistent?
- **SPC** (Spacing) - Is white space used effectively?
- **IMG** (Imagery) - Do images enhance or distract?
- **MOT** (Motion) - Do animations guide or annoy?
- **ACC** (Accessibility) - WCAG compliance (contrast, tap targets, focus states)
- **RSP** (Responsive) - Mobile, tablet, desktop harmony
- **TRD** (Trends) - Modern without being trendy
- **EMO** (Emotional Impact) - Does it build trust and connection?

### 📊 Bureau-Style Audit Reports

#### Free Tier (Teaser Report)
- Overall Cynthia Score (0-100)
- Top 3-7 high-impact findings
- Total issues detected summary
- Estimated impact (clarity, trust, conversion)

#### Paid Tier (Full Report)
- Complete issue list with exact fixes
- Refactor patches / Fix Packs
- Before/after previews & token diffs
- Governance rules + regression prevention
- Exportable patch + changelog

### 🔧 Fix Packs

Actionable groups of related fixes:

- **Layout Pack** - Grid, spacing, hierarchy
- **Type Pack** - Font scales, weights, line heights
- **Color Pack** - Palette refinement, contrast fixes
- **Spacing Pack** - Consistent rhythm
- **Motion Pack** - Transitions, animations
- **Accessibility Pack** - WCAG compliance

### 🎨 Severity Levels

- **Critical** - Blocks conversion, accessibility failure, broken UX
- **Major** - Significant friction, poor hierarchy, weak trust signals
- **Minor** - Polish issues, small inconsistencies
- **Info** - Suggestions for enhancement

### 🛠️ Fix Types

Every fix specifies its type:

- **token_change** - Design system tokens (colors, spacing, typography)
- **content_change** - Copy, labels, microcopy improvements
- **layout_change** - Structure, grid, composition shifts
- **component_change** - Component architecture updates
- **motion_change** - Animation, transitions, micro-interactions

## Architecture

### Database Schema

Audits are stored in the `cynthia_audits` table with the following structure:

```typescript
{
  id: uuid,
  projectId: uuid,
  userId: uuid,
  status: 'pending' | 'running' | 'completed' | 'failed',
  targetType: 'url' | 'screenshot' | 'frame' | 'component',
  targetValue: string,
  context?: { productType, audience, goal },
  constraints?: { brand, stack, timeline },
  overallScore: number,
  udecScores: Record<UDECAxis, number>,
  issuesFoundTotal: number,
  teaserIssues: DesignIssue[],
  fullIssues: DesignIssue[],
  fixPacks: FixPack[],
  tokenChanges: TokenChange[],
  patchPlan: PatchPlan,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp
}
```

### API Endpoints (tRPC)

#### `audit.create`
Create a new audit and start processing.

```typescript
input: {
  projectId: string,
  targetType: 'url' | 'screenshot' | 'frame' | 'component',
  targetValue: string,
  context?: { productType, audience, goal },
  constraints?: { brand, stack, timeline }
}
```

#### `audit.get`
Get audit by ID (requires ownership).

#### `audit.list`
List all audits for a project.

#### `audit.getTeaser`
Get teaser report (free tier) - returns overall score, UDEC scores, and top issues.

#### `audit.getFull`
Get full report (requires subscription check) - returns complete analysis and fix packs.

#### `audit.updateStatus`
Update audit status (internal use).

#### `audit.saveResults`
Save audit results (internal use).

### AI Agent Integration

Cynthia is integrated into the AI chat system:

1. **Chat Type:** `ChatType.AUDIT` triggers Cynthia mode
2. **System Prompt:** Specialized prompt with UDEC scoring instructions
3. **Model Routing:** Uses `ReasonerTier` (Claude Sonnet 4.5) for primary analysis
4. **Tool:** `cynthia_audit` tool available to all agents

#### Using the Tool

The AI agent can trigger audits via the `cynthia_audit` tool:

```typescript
{
  targetType?: 'url' | 'frame' | 'component',
  targetValue?: string,  // Optional, defaults to current frame
  context?: {
    productType?: string,
    audience?: string,
    goal?: string
  }
}
```

Example chat:
- "Audit my UI"
- "Run a Cynthia audit on this page"
- "Check the design quality"

### UI Components

Located at: `apps/web/client/src/app/project/[id]/_components/right-panel/audit-tab/`

Features:
- New audit creation interface
- Real-time status updates with polling
- Bureau-style report display
- UDEC score visualization
- Top issues teaser with severity badges
- Axis labels and color-coded severity
- Paywall component for full report upgrade

### Audit Engine

Located at: `packages/ai/src/audit/engine.ts`

Key functions:

#### `runAudit(input: AuditInput)`
Executes a complete audit using structured object generation with Zod schemas.

#### `streamAudit(input: AuditInput)`
Streams audit results for real-time feedback.

### Background Processor

Located at: `apps/web/client/src/server/api/routers/cynthia/processor.ts`

Handles async audit execution:
- Updates status to RUNNING
- Calls audit engine
- Saves results to database
- Handles errors and failures

## Usage

### From the UI

1. Open a project in Onlook
2. Navigate to the Audit tab (right panel)
3. Enter a URL or select current frame
4. Click "Run Audit"
5. View teaser results when complete
6. Upgrade for full report and fix packs

### From AI Chat

Simply ask the AI agent to audit your design:

```
"Can you audit the design of this page?"
"Run a Cynthia audit on my landing page"
"What design issues do you see?"
```

The agent will use the `cynthia_audit` tool automatically.

### Programmatically

```typescript
import { api } from '@/trpc/react';

const createAudit = api.audit.create.useMutation();

const result = await createAudit.mutateAsync({
  projectId: 'project-uuid',
  targetType: 'url',
  targetValue: 'https://example.com',
  context: {
    productType: 'SaaS landing page',
    audience: 'Developers',
    goal: 'Sign up conversion'
  }
});
```

## Model Routing (LightLLM)

Cynthia uses task-based model routing:

| Task | Model Tier | Model | Purpose |
|------|-----------|-------|---------|
| UI_AUDIT_REASONING | ReasonerTier | Claude 4.5 Sonnet | Primary UDEC scoring + design critique |
| MULTIMODAL_UNDERSTAND | GeminiTier | GPT-5 | Screenshot understanding, layout detection |
| PIXEL_TO_PIXEL_REPLICATION | GLM_4_6V_Tier | (Premium) | Pixel-accurate UI replication |
| COPY_REWRITE_LUXURY | WriterTier | GPT-5 | High-polish marketing copy |
| CODE_REFACTOR | CoderTier | GPT-5 | Safe diffs, maintain structure |

## Future Enhancements

### Phase 5: Governance & Token System
- [ ] Design token extraction from existing UI
- [ ] Token violation detection
- [ ] Automated migration plan generator
- [ ] Brand memory system integration

### Phase 7: Premium Features
- [ ] Pixel-to-pixel replication (GLM-4.6V integration)
- [ ] Governance mode (rules + regression checks)
- [ ] Team collaboration features
- [ ] Custom policy packs

### Phase 8: Integration & Testing
- [ ] Write comprehensive tests
- [ ] Add documentation examples
- [ ] Performance optimization
- [ ] Error handling improvements

## Pricing Tiers

- **Free** - Teaser reports, 1 project, limited findings
- **Pro ($29/mo)** - Full reports, unlimited audits, fix packs, design system generator
- **Studio ($79/mo)** - Team seats, governance mode, brand memory, priority routing
- **Enterprise (Custom)** - SAML/SSO, custom policies, on-prem, dedicated support

## Voice & Tone

Cynthia's personality:
- **Direct and high-standards** - No sugarcoating
- **Helpful but not nice** - Focus on improvement
- **Playfully ruthless** - "Punisher" energy, never insulting
- **Measurable** - Always specific (px, %, ms, contrast ratios)

## Non-Negotiables

1. Every finding MUST include: (a) what's wrong, (b) why it matters, (c) exact fix with measurable values
2. No vague advice - always specific measurements
3. Accessibility checks are mandatory (contrast ratios, tap targets ≥44x44px, focus states)
4. All refactors must be reversible (patch + changelog)
5. Focus on systemic improvements over one-off fixes

## Example Output

```json
{
  "product": "Cynthia",
  "version": "3.0",
  "overall_score": 68,
  "udec_scores": {
    "CTX": 75, "DYN": 60, "LFT": 70, "TYP": 85, "CLR": 55,
    "GRD": 65, "SPC": 70, "IMG": 80, "MOT": 50, "ACC": 45,
    "RSP": 65, "TRD": 75, "EMO": 70
  },
  "issues_found_total": 23,
  "teaser_issues": [
    {
      "id": "acc-001",
      "axis": "ACC",
      "severity": "critical",
      "title": "Insufficient color contrast on CTA button",
      "description": "Primary CTA button has 3.2:1 contrast ratio",
      "reason": "Fails WCAG AA (4.5:1) - reduces visibility for users with low vision",
      "impact": "Lost conversions, accessibility compliance risk",
      "fix": {
        "type": "token_change",
        "description": "Increase button text color darkness",
        "measurements": {
          "contrast": 4.8,
          "values": { "color": "#1a1a1a", "background": "#3b82f6" }
        }
      }
    }
  ]
}
```

## Contributing

When adding new features to Cynthia:

1. Update UDEC axes if adding new scoring criteria
2. Add corresponding types to `packages/models/src/cynthia/`
3. Update the system prompt in `packages/ai/src/prompt/constants/cynthia.ts`
4. Add UI components following the bureau-style report pattern
5. Test with various project types and audiences

## License

Apache 2.0
