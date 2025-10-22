# Demo-Gating Implementation Plan

## Overview

This document outlines the plan to transition Onlook from an open sign-up model to a demo-gated model where users must book a demo/call with the team before gaining full access to the product.

### Goals

1. Remove project creation prompts from the homepage
2. Allow existing users to continue signing in and accessing their projects
3. Require new users (or users without access) to book a demo before creating projects
4. Maintain ability for users to explore the product concept

---

## Current State Analysis

### Homepage Entry Points

1. **Hero Section** (`apps/web/client/src/app/_components/hero/index.tsx`)
   - "Create" card with AI prompt input
   - "Start Blank" project button
   - "Import" existing project option

2. **CTA Section** (`apps/web/client/src/app/_components/landing-page/cta-section.tsx`)
   - "Get Started" button (scrolls to hero by default)

3. **Top Bar** (`apps/web/client/src/app/_components/top-bar/user.tsx`)
   - "Sign In" button for non-authenticated users
   - "Projects" + avatar dropdown for authenticated users

### Current Auth Flow

- Users can create projects without signing in initially
- Auth modal opens when trying to create a project without being logged in
- Saves draft/context to localStorage and prompts login
- After login, restores context and continues project creation

---

## Implementation Plan

### Phase 1: Remove Create Prompts from Homepage

#### Files to Modify

**1. Hero Section** (`apps/web/client/src/app/_components/hero/index.tsx:89-119`)
- Remove or hide the "Create" card component
- Remove or hide the "Start Blank" button
- Remove or hide the "Import" option (unless needed for existing users)
- Replace with new CTA that:
  - Directs to demo booking for non-authenticated users
  - Directs to projects page for authenticated users with access
  - Directs to demo page for authenticated users without access

**2. CTA Section** (`apps/web/client/src/app/_components/landing-page/cta-section.tsx:15-39`)
- Update "Get Started" button behavior:
  - Non-authenticated users → Redirect to `/demo`
  - Authenticated users with access → Redirect to `/projects`
  - Authenticated users without access → Redirect to `/demo`

**3. Update Hero Messaging**
- Change value proposition to focus on booking demo
- Add social proof (testimonials, logos, stats)
- Emphasize what they'll see in the demo
- Example copy: "See Onlook in action" / "Schedule your personalized demo"

---

### Phase 2: Create Demo Booking Page

#### New Files to Create

**1. Demo Page** (`apps/web/client/src/app/demo/page.tsx`)

```typescript
'use client';

import { api } from '@/trpc/react';
import { WebsiteLayout } from '@/app/_components/website-layout';
import { DemoForm } from './_components/demo-form';

export default function DemoPage() {
    const { data: user } = api.user.get.useQuery();
    const { data: access } = api.user.checkAccess.useQuery(
        undefined,
        { enabled: !!user }
    );

    return (
        <WebsiteLayout showFooter={true}>
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-5xl font-light mb-4">
                        Book a Demo
                    </h1>
                    <p className="text-foreground-secondary text-lg mb-12">
                        Schedule a personalized walkthrough of Onlook with our team
                    </p>

                    {/* Show different content based on user state */}
                    {user && access?.hasAccess ? (
                        <div>
                            <p>You already have access! Go to your projects.</p>
                            <Button asChild>
                                <Link href="/projects">View Projects</Link>
                            </Button>
                        </div>
                    ) : (
                        <DemoForm user={user} />
                    )}

                    {/* Features/Benefits Section */}
                    <div className="mt-16">
                        <h2 className="text-2xl mb-8">What you'll see in the demo:</h2>
                        <ul className="space-y-4">
                            <li>• AI-powered design workflow</li>
                            <li>• Real-time code generation</li>
                            <li>• Component library integration</li>
                            <li>• Collaboration features</li>
                        </ul>
                    </div>
                </div>
            </div>
        </WebsiteLayout>
    );
}
```

**2. Demo Form Component** (`apps/web/client/src/app/demo/_components/demo-form.tsx`)

```typescript
'use client';

import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { Textarea } from '@onlook/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';

export function DemoForm({ user }: { user: any }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            company: formData.get('company'),
            useCase: formData.get('useCase'),
        };

        try {
            // Submit to your backend/HubSpot/Calendly
            // const response = await fetch('/api/demo-request', {
            //     method: 'POST',
            //     body: JSON.stringify(data),
            // });

            toast.success('Demo request submitted!');
        } catch (error) {
            toast.error('Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="name">Name</label>
                <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={user?.name}
                />
            </div>
            <div>
                <label htmlFor="email">Email</label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={user?.email}
                />
            </div>
            <div>
                <label htmlFor="company">Company</label>
                <Input id="company" name="company" />
            </div>
            <div>
                <label htmlFor="useCase">What would you like to build?</label>
                <Textarea id="useCase" name="useCase" rows={4} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Request Demo'}
            </Button>
        </form>
    );
}
```

#### Demo Scheduling Tool Options

Choose one of these tools for scheduling:

1. **HubSpot Meetings** - If already using HubSpot CRM
   - Embed code: `<script src="https://static.hsappstatic.net/MeetingsEmbed/ex.js"></script>`

2. **Calendly** - Easy embed, popular choice
   - Widget: `<div class="calendly-inline-widget" data-url="https://calendly.com/your-link"></div>`

3. **Cal.com** - Open source, self-hostable
   - Embed: `<Cal.com calLink="your-username/demo" />`

4. **Chili Piper** - Advanced routing and scheduling
   - For enterprise sales teams

5. **SavvyCal** - Modern, clean UX
   - Good for small teams

---

### Phase 3: User Access Control System

#### Database Schema Changes

Add user access tracking. Choose one approach:

**Option A: Simple Boolean Flag**
```sql
-- Add column to users table
ALTER TABLE users ADD COLUMN has_demo_access BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN demo_scheduled_at TIMESTAMP;
ALTER TABLE users ADD COLUMN demo_completed_at TIMESTAMP;
```

**Option B: Plan-Based Access**
```sql
-- Add plan field to users table
ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'none';
-- Values: 'none', 'demo_scheduled', 'demo_completed', 'free', 'pro'
```

**Option C: Separate Access Table**
```sql
CREATE TABLE user_access (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    plan VARCHAR(50) NOT NULL,
    has_access BOOLEAN DEFAULT FALSE,
    demo_scheduled_at TIMESTAMP,
    demo_completed_at TIMESTAMP,
    granted_at TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### tRPC API Updates

**1. Create Access Router** (`apps/web/client/src/server/api/routers/access.ts`)

```typescript
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';

export const accessRouter = createTRPCRouter({
    checkAccess: protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.db.user.findUnique({
            where: { id: ctx.user.id },
            select: { hasDemoAccess: true, plan: true },
        });

        return {
            hasAccess: user?.hasDemoAccess ?? false,
            plan: user?.plan ?? 'none',
        };
    }),

    grantAccess: protectedProcedure
        .input(z.object({
            userId: z.string(),
            plan: z.enum(['free', 'pro', 'demo_completed']),
        }))
        .mutation(async ({ ctx, input }) => {
            // Only allow admins to grant access
            // Add admin check here

            await ctx.db.user.update({
                where: { id: input.userId },
                data: {
                    hasDemoAccess: true,
                    plan: input.plan,
                },
            });

            return { success: true };
        }),

    requestDemo: publicProcedure
        .input(z.object({
            name: z.string(),
            email: z.string().email(),
            company: z.string().optional(),
            useCase: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Store demo request
            // Send to HubSpot/CRM
            // Send notification to team

            return { success: true };
        }),
});
```

**2. Update Root Router** (`apps/web/client/src/server/api/root.ts`)

```typescript
import { accessRouter } from './routers/access';

export const appRouter = createTRPCRouter({
    // ... existing routers
    access: accessRouter,
});
```

**3. Update User Router** (`apps/web/client/src/server/api/routers/user.ts`)

Add access check method:

```typescript
checkAccess: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { hasDemoAccess: true, plan: true },
    });

    return {
        hasAccess: user?.hasDemoAccess ?? false,
        plan: user?.plan ?? 'none',
    };
}),
```

---

### Phase 4: Protect Project Creation Routes

#### Files to Modify

**1. Create Component** (`apps/web/client/src/app/_components/hero/create.tsx`)

```typescript
// Add at the top of createProject function (line 85)
const createProject = async (prompt: string, images: ImageMessageContext[]) => {
    if (!user?.id) {
        // ... existing auth check
    }

    // NEW: Check if user has demo access
    const accessCheck = await fetch('/api/trpc/access.checkAccess');
    const { hasAccess } = await accessCheck.json();

    if (!hasAccess) {
        toast.error('Demo access required', {
            description: 'Please book a demo to start creating projects',
        });
        router.push('/demo');
        return;
    }

    // ... rest of existing code
};
```

**2. Start Blank Component** (`apps/web/client/src/app/_components/hero/start-blank.tsx`)

```typescript
// Add at the top of handleStartBlankProject function (line 27)
const handleStartBlankProject = async () => {
    if (!user?.id) {
        // ... existing auth check
    }

    // NEW: Check if user has demo access
    const accessCheck = await fetch('/api/trpc/access.checkAccess');
    const { hasAccess } = await accessCheck.json();

    if (!hasAccess) {
        toast.error('Demo access required', {
            description: 'Please book a demo to start creating projects',
        });
        router.push('/demo');
        return;
    }

    // ... rest of existing code
};
```

**3. Project Create API** (`apps/web/client/src/server/api/routers/project.ts`)

Add server-side validation:

```typescript
create: protectedProcedure
    .input(/* ... */)
    .mutation(async ({ ctx, input }) => {
        // NEW: Check if user has access
        const user = await ctx.db.user.findUnique({
            where: { id: ctx.user.id },
            select: { hasDemoAccess: true },
        });

        if (!user?.hasDemoAccess) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Demo access required. Please book a demo.',
            });
        }

        // ... rest of existing code
    }),
```

**4. Sandbox Fork API** (`apps/web/client/src/server/api/routers/sandbox.ts`)

Add same access check:

```typescript
fork: protectedProcedure
    .input(/* ... */)
    .mutation(async ({ ctx, input }) => {
        // NEW: Check if user has access
        const user = await ctx.db.user.findUnique({
            where: { id: ctx.user.id },
            select: { hasDemoAccess: true },
        });

        if (!user?.hasDemoAccess) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Demo access required. Please book a demo.',
            });
        }

        // ... rest of existing code
    }),
```

---

### Phase 5: Update Navigation & Messaging

#### Files to Modify

**1. Top Bar User Component** (`apps/web/client/src/app/_components/top-bar/user.tsx`)

```typescript
export const AuthButton = () => {
    const { data: user } = api.user.get.useQuery();
    const { data: access } = api.user.checkAccess.useQuery(
        undefined,
        { enabled: !!user }
    );

    return (
        <div className="flex items-center gap-3 mt-0">
            {user ? (
                <>
                    <Button variant="secondary" asChild className="rounded cursor-pointer">
                        <Link href={Routes.PROJECTS}>Projects</Link>
                    </Button>
                    <CurrentUserAvatar className="cursor-pointer hover:opacity-80" />
                </>
            ) : (
                <>
                    <Button variant="ghost" asChild className="rounded cursor-pointer">
                        <Link href={Routes.LOGIN}>Sign In</Link>
                    </Button>
                    <Button variant="secondary" asChild className="rounded cursor-pointer">
                        <Link href="/demo">Book Demo</Link>
                    </Button>
                </>
            )}
        </div>
    );
};
```

**2. Update Hero Section**

Replace project creation UI with demo CTA:

```typescript
// In apps/web/client/src/app/_components/hero/index.tsx
<motion.div className="relative z-20 flex flex-col items-center gap-4">
    <Button size="lg" asChild>
        <Link href={user ? '/projects' : '/demo'}>
            {user ? 'Go to Projects' : 'Book a Demo'}
        </Link>
    </Button>
    <p className="text-foreground-secondary text-sm">
        See Onlook in action with a personalized walkthrough
    </p>
</motion.div>
```

**3. Update Footer** (`apps/web/client/src/app/_components/landing-page/page-footer.tsx`)

Add "Book Demo" link to Product section or create new "Get Started" section.

**4. Update CTA Section** (`apps/web/client/src/app/_components/landing-page/cta-section.tsx`)

```typescript
const handleGetStartedClick = () => {
    // Check if user is authenticated and has access
    if (user) {
        if (hasAccess) {
            router.push('/projects');
        } else {
            router.push('/demo');
        }
    } else {
        router.push('/demo');
    }
};
```

---

### Phase 6: Internationalization Updates

#### Files to Modify

**1. Add Demo Strings** (`apps/web/client/messages/en.json`)

```json
{
  "demo": {
    "title": "Book a Demo",
    "subtitle": "Schedule a personalized walkthrough of Onlook",
    "cta": "Request Demo",
    "success": "Demo request submitted successfully",
    "error": "Failed to submit demo request",
    "noAccess": "Demo access required",
    "noAccessDescription": "Please book a demo to start creating projects",
    "form": {
      "name": "Name",
      "email": "Email",
      "company": "Company",
      "useCase": "What would you like to build?",
      "submit": "Request Demo",
      "submitting": "Submitting..."
    },
    "benefits": {
      "title": "What you'll see in the demo:",
      "ai": "AI-powered design workflow",
      "code": "Real-time code generation",
      "components": "Component library integration",
      "collaboration": "Team collaboration features"
    }
  },
  "hero": {
    "demoButton": "Book a Demo",
    "projectsButton": "Go to Projects",
    "demoDescription": "See Onlook in action with a personalized walkthrough"
  }
}
```

---

## Implementation Approaches

### Option A: Soft Gate (Recommended for Testing)

**Characteristics:**
- Keep existing users' access unchanged
- Only gate new signups after a specific date
- Allow existing projects to be edited
- Easier rollback if needed

**Implementation:**
```typescript
// Check user creation date
const userCreatedAt = new Date(user.createdAt);
const gateDate = new Date('2024-01-01'); // Set your cutoff date

const hasAccess = userCreatedAt < gateDate || user.hasDemoAccess;
```

**Pros:**
- Less disruptive to existing users
- Can test with new users first
- Easier to communicate changes

**Cons:**
- More complex logic
- Two different user experiences

---

### Option B: Hard Gate

**Characteristics:**
- Require ALL users to book demo (or manually grant access to existing users)
- Clear, consistent experience
- May frustrate existing users

**Implementation:**
```typescript
const hasAccess = user.hasDemoAccess === true;
```

**Before Implementing:**
1. Email all existing users about the change
2. Provide 1-2 week notice period
3. Automatically grant access to active users
4. Offer expedited demo scheduling

**Pros:**
- Simple, consistent logic
- Clear product direction
- Better data on user intent

**Cons:**
- May lose some existing users
- Requires good communication plan

---

### Option C: Gradual Migration

**Characteristics:**
- Announce change 1-2 weeks in advance
- Grandfather all existing users (auto-grant access)
- Show banner/notification about new model
- Give existing users time to complete projects

**Implementation:**
```typescript
// Step 1: Add banner to all pages for existing users
<Banner>
  Starting [DATE], new users will need to book a demo.
  Your existing access will remain unchanged.
</Banner>

// Step 2: Auto-grant access to all users before cutoff date
await db.user.updateMany({
    where: {
        createdAt: { lt: cutoffDate }
    },
    data: {
        hasDemoAccess: true,
        plan: 'grandfathered'
    }
});

// Step 3: Implement gating for new users
const isGrandfathered = user.plan === 'grandfathered';
const hasAccess = isGrandfathered || user.hasDemoAccess;
```

**Timeline:**
- **Week 1**: Announce change, show banner
- **Week 2**: Continue announcements, email users
- **Week 3**: Implement gating for new signups
- **Week 4+**: Monitor and adjust

**Pros:**
- Respectful to existing users
- Good for community relations
- Time to gather feedback

**Cons:**
- Longer implementation timeline
- More communication required

---

## Technical Considerations

### 1. Access Control Storage

**Recommended: Use existing Supabase user table**
- Add columns: `has_demo_access`, `plan`, `demo_scheduled_at`
- Simple to implement
- Leverages existing auth infrastructure

**Alternative: Separate access/subscription table**
- More flexible for future plans
- Better for audit trail
- Can track access changes over time

### 2. Caching Strategy

```typescript
// Cache access checks for performance
const { data: access } = api.user.checkAccess.useQuery(
    undefined,
    {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    }
);
```

### 3. Feature Flags (Optional)

Consider using feature flags for gradual rollout:

```typescript
// Using a feature flag service
const isDemoGatingEnabled = useFeatureFlag('demo-gating');

if (isDemoGatingEnabled && !hasAccess) {
    router.push('/demo');
}
```

**Feature Flag Services:**
- PostHog (analytics + flags)
- LaunchDarkly (enterprise)
- Unleash (open source)
- Split.io

---

## Analytics & Tracking

### Events to Track

1. **Demo Page Events:**
   - Page view: `/demo`
   - Form started
   - Form submitted
   - Form submission success/error
   - Scheduling tool opened (if using Calendly/Cal.com)

2. **Conversion Events:**
   - Demo booked
   - Demo completed
   - Access granted
   - First project created after demo

3. **Blocking Events:**
   - User attempted project creation without access
   - Redirect to demo page

### Implementation Example

```typescript
// In demo form submission
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Track form submission
    analytics.track('Demo Form Submitted', {
        userId: user?.id,
        email: formData.email,
        company: formData.company,
    });

    try {
        await submitDemoRequest(formData);

        analytics.track('Demo Request Success', {
            userId: user?.id,
        });
    } catch (error) {
        analytics.track('Demo Request Error', {
            userId: user?.id,
            error: error.message,
        });
    }
};
```

---

## Communication Plan

### User-Facing Communications

**1. Existing Users Email (if using Option B or C)**

Subject: "Important Update: New Demo Process for Onlook"

```
Hi [Name],

We're making Onlook even better! To provide a more personalized experience,
we're introducing guided demos for all new users.

What this means for you:
[Option C] - Your existing access remains unchanged
[Option B] - Please book a quick demo to continue (we'll fast-track you!)

Why we're doing this:
- Personalized onboarding experience
- Better support for your specific use case
- Direct line to our team for feedback

Book your demo: [link]

Questions? Reply to this email or join our Discord.

Thanks,
The Onlook Team
```

**2. Homepage Banner (Temporary)**

```
📣 New users: Book a demo to get started with Onlook
[Book Demo] [Learn More]
```

**3. Social Media Announcements**

- LinkedIn/Twitter post about new personalized onboarding
- Emphasize value of 1-on-1 demos
- Share testimonials from demo participants

---

## Testing Plan

### Pre-Launch Checklist

- [ ] Database schema updated
- [ ] tRPC routes created and tested
- [ ] Demo page created and styled
- [ ] Demo form submission working
- [ ] Access checks implemented in all project creation flows
- [ ] Homepage CTAs updated
- [ ] Navigation updated
- [ ] Error handling and user feedback implemented
- [ ] Analytics tracking implemented
- [ ] Email templates created (if needed)
- [ ] Admin panel for granting access (if needed)
- [ ] Existing users migrated (if using Option C)
- [ ] Test accounts created for QA

### Test Scenarios

**1. New User Flow:**
- [ ] Visit homepage → see demo CTA
- [ ] Click "Get Started" → redirected to `/demo`
- [ ] Submit demo request → success message
- [ ] Attempt to create project → blocked, redirected to demo
- [ ] After demo, access granted → can create projects

**2. Existing User Flow (with access):**
- [ ] Sign in → can access projects
- [ ] Create new project → works normally
- [ ] Import project → works normally

**3. Existing User Flow (without access):**
- [ ] Sign in → can view existing projects
- [ ] Attempt new project → blocked, redirected to demo
- [ ] See "Book Demo" CTA in projects page

**4. Edge Cases:**
- [ ] Attempting direct URL to project creation
- [ ] API calls without proper access
- [ ] Race conditions (multiple requests)
- [ ] User granted access mid-session (cache invalidation)

---

## Rollback Plan

If demo-gating causes issues, here's how to quickly rollback:

### Quick Rollback (Emergency)

**1. Feature Flag Toggle**
```typescript
// Set flag to false to disable gating
const DEMO_GATING_ENABLED = false;
```

**2. Database Update**
```sql
-- Grant all users access temporarily
UPDATE users SET has_demo_access = TRUE;
```

**3. Restore Previous Components**
```bash
# If using git
git checkout main -- apps/web/client/src/app/_components/hero/
```

### Gradual Rollback

1. Stop enforcing access checks (but keep tracking data)
2. Re-enable project creation for all users
3. Keep demo page live for interested users
4. Analyze what went wrong
5. Plan improvements before re-launch

---

## Success Metrics

### Key Metrics to Track

**Conversion Funnel:**
1. Homepage visitors
2. Demo page visits
3. Demo requests submitted
4. Demos scheduled
5. Demos completed
6. Access granted
7. First project created
8. Active users (7-day, 30-day)

**Target Benchmarks:**
- Demo page visit rate: 20-30% of homepage visitors
- Demo request rate: 40-60% of demo page visitors
- Demo show rate: 60-80% of scheduled demos
- Activation rate: 80%+ of demo attendees create projects

**Quality Metrics:**
- Time from demo to first project
- Project completion rate
- User satisfaction (post-demo survey)
- Customer acquisition cost (CAC)
- Lifetime value (LTV)

---

## Post-Launch Monitoring

### First Week

- [ ] Monitor demo request volume
- [ ] Track error rates
- [ ] Check user feedback channels (Discord, support)
- [ ] Review analytics dashboards daily
- [ ] Test demo booking process from user perspective

### First Month

- [ ] Analyze conversion funnel
- [ ] Survey demo attendees
- [ ] Gather qualitative feedback
- [ ] Identify drop-off points
- [ ] A/B test demo page variations

### Ongoing

- [ ] Weekly conversion rate review
- [ ] Monthly user satisfaction survey
- [ ] Quarterly strategy review
- [ ] Continuous optimization of demo content

---

## Next Steps

1. **Choose Implementation Approach** (A, B, or C)
2. **Select Demo Scheduling Tool** (HubSpot, Calendly, Cal.com, etc.)
3. **Create Timeline** (e.g., 2-week implementation)
4. **Assign Responsibilities** (frontend, backend, design, copy)
5. **Set Up Staging Environment** for testing
6. **Create Communication Assets** (emails, banners, social posts)
7. **Begin Implementation** following phases 1-6

---

## File Reference

### Files to Modify

- `apps/web/client/src/app/page.tsx` - Main homepage
- `apps/web/client/src/app/_components/hero/index.tsx` - Hero section
- `apps/web/client/src/app/_components/hero/create.tsx` - Create component
- `apps/web/client/src/app/_components/hero/start-blank.tsx` - Start blank
- `apps/web/client/src/app/_components/landing-page/cta-section.tsx` - CTA section
- `apps/web/client/src/app/_components/top-bar/user.tsx` - Auth button
- `apps/web/client/src/app/_components/landing-page/page-footer.tsx` - Footer
- `apps/web/client/src/server/api/routers/user.ts` - User API
- `apps/web/client/src/server/api/routers/project.ts` - Project API
- `apps/web/client/src/server/api/routers/sandbox.ts` - Sandbox API
- `apps/web/client/src/server/api/root.ts` - API root
- `apps/web/client/messages/en.json` - i18n strings

### Files to Create

- `apps/web/client/src/app/demo/page.tsx` - Demo page
- `apps/web/client/src/app/demo/_components/demo-form.tsx` - Demo form
- `apps/web/client/src/server/api/routers/access.ts` - Access control API (optional)

---

## Questions to Answer Before Starting

1. Which implementation approach? (A, B, or C)
2. Which demo scheduling tool?
3. How will access be granted after demos?
4. What's the timeline for implementation?
5. Who will handle the demos?
6. What's the communication plan for existing users?
7. Do you need an admin panel for access management?
8. Should we keep any "try it" experience (limited features)?

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Status:** Ready for implementation
