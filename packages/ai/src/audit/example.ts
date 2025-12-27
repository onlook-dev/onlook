/**
 * Example usage of Cynthia Audit Engine
 * This demonstrates how to use the audit system programmatically
 */

import type { AuditInput, CynthiaReport } from '@onlook/models';
import { runAudit } from './engine';

/**
 * Example 1: Audit a URL
 */
export async function auditUrlExample() {
    const input: AuditInput = {
        target: {
            type: 'url',
            value: 'https://example.com',
        },
        context: {
            productType: 'SaaS landing page',
            audience: 'Developers',
            goal: 'Sign up conversion',
        },
        constraints: {
            brand: {
                primaryColor: '#3b82f6',
                fontFamily: 'Inter',
            },
            stack: ['React', 'TailwindCSS', 'Next.js'],
            timeline: '1 week',
        },
    };

    try {
        const report = await runAudit(input);
        console.log('Audit completed!');
        console.log('Overall Score:', report.overallScore);
        console.log('Issues Found:', report.issuesFoundTotal);
        console.log('Top Issues:', report.teaserIssues);
        return report;
    } catch (error) {
        console.error('Audit failed:', error);
        throw error;
    }
}

/**
 * Example 2: Audit current frame
 */
export async function auditCurrentFrameExample(frameUrl: string) {
    const input: AuditInput = {
        target: {
            type: 'frame',
            value: frameUrl,
        },
        context: {
            productType: 'Dashboard',
            audience: 'Enterprise users',
            goal: 'Task completion',
        },
    };

    const report = await runAudit(input);
    return report;
}

/**
 * Example 3: Process audit results
 */
export function analyzeAuditReport(report: Partial<CynthiaReport>) {
    console.log('\n=== CYNTHIA AUDIT REPORT ===\n');
    
    // Overall score
    console.log(`Overall Score: ${report.overallScore}/100`);
    
    // UDEC breakdown
    if (report.udecScores) {
        console.log('\nUDEC Scores:');
        Object.entries(report.udecScores).forEach(([axis, score]) => {
            const status = score >= 80 ? '✓' : score >= 60 ? '!' : '✗';
            console.log(`  ${status} ${axis}: ${score}/100`);
        });
    }
    
    // Critical issues
    const criticalIssues = report.teaserIssues?.filter(
        issue => issue.severity === 'critical'
    );
    if (criticalIssues && criticalIssues.length > 0) {
        console.log(`\n⚠️  ${criticalIssues.length} Critical Issues:`);
        criticalIssues.forEach(issue => {
            console.log(`  - ${issue.title}`);
            console.log(`    ${issue.description}`);
            console.log(`    Fix: ${issue.fix.description}`);
        });
    }
    
    // Fix packs summary
    if (report.fixPacks && report.fixPacks.length > 0) {
        console.log('\nAvailable Fix Packs:');
        report.fixPacks.forEach(pack => {
            console.log(`  - ${pack.name} (${pack.issues.length} fixes)`);
            console.log(`    ${pack.description}`);
        });
    }
    
    console.log('\n=== END REPORT ===\n');
}

/**
 * Example 4: Compare before/after scores
 */
export function compareAudits(
    before: Partial<CynthiaReport>,
    after: Partial<CynthiaReport>
) {
    console.log('\n=== AUDIT COMPARISON ===\n');
    
    const scoreDiff = (after.overallScore || 0) - (before.overallScore || 0);
    const improvement = scoreDiff > 0 ? '↑' : scoreDiff < 0 ? '↓' : '→';
    
    console.log(`Overall: ${before.overallScore} ${improvement} ${after.overallScore} (${scoreDiff > 0 ? '+' : ''}${scoreDiff})`);
    
    if (before.udecScores && after.udecScores) {
        console.log('\nAxis Improvements:');
        Object.keys(before.udecScores).forEach(axis => {
            const beforeScore = before.udecScores![axis as keyof typeof before.udecScores];
            const afterScore = after.udecScores![axis as keyof typeof after.udecScores];
            const diff = afterScore - beforeScore;
            
            if (Math.abs(diff) >= 5) {
                const arrow = diff > 0 ? '↑' : '↓';
                console.log(`  ${axis}: ${beforeScore} ${arrow} ${afterScore} (${diff > 0 ? '+' : ''}${diff})`);
            }
        });
    }
    
    const issueReduction = (before.issuesFoundTotal || 0) - (after.issuesFoundTotal || 0);
    if (issueReduction > 0) {
        console.log(`\n✓ Fixed ${issueReduction} issues`);
    }
    
    console.log('\n=== END COMPARISON ===\n');
}
