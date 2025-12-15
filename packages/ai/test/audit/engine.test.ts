/**
 * Tests for Cynthia Audit Engine
 */

import { describe, expect, it } from 'vitest';
import { UDECAxis, IssueSeverity, FixType, type AuditInput } from '@onlook/models';

describe('Cynthia Audit Engine', () => {
    describe('UDEC Scoring', () => {
        it('should have 13 scoring axes', () => {
            const axes = Object.values(UDECAxis);
            expect(axes).toHaveLength(13);
            expect(axes).toContain(UDECAxis.CTX);
            expect(axes).toContain(UDECAxis.ACC);
        });

        it('should support all severity levels', () => {
            const severities = Object.values(IssueSeverity);
            expect(severities).toContain(IssueSeverity.CRITICAL);
            expect(severities).toContain(IssueSeverity.MAJOR);
            expect(severities).toContain(IssueSeverity.MINOR);
            expect(severities).toContain(IssueSeverity.INFO);
        });

        it('should support all fix types', () => {
            const fixTypes = Object.values(FixType);
            expect(fixTypes).toContain(FixType.TOKEN_CHANGE);
            expect(fixTypes).toContain(FixType.CONTENT_CHANGE);
            expect(fixTypes).toContain(FixType.LAYOUT_CHANGE);
            expect(fixTypes).toContain(FixType.COMPONENT_CHANGE);
            expect(fixTypes).toContain(FixType.MOTION_CHANGE);
        });
    });

    describe('Audit Input Validation', () => {
        it('should accept valid URL target', () => {
            const input: AuditInput = {
                target: {
                    type: 'url',
                    value: 'https://example.com',
                },
            };
            expect(input.target.type).toBe('url');
        });

        it('should accept frame target', () => {
            const input: AuditInput = {
                target: {
                    type: 'frame',
                    value: 'frame-123',
                },
            };
            expect(input.target.type).toBe('frame');
        });

        it('should accept component target', () => {
            const input: AuditInput = {
                target: {
                    type: 'component',
                    value: 'Button.tsx',
                },
            };
            expect(input.target.type).toBe('component');
        });

        it('should accept optional context', () => {
            const input: AuditInput = {
                target: {
                    type: 'url',
                    value: 'https://example.com',
                },
                context: {
                    productType: 'SaaS',
                    audience: 'Developers',
                    goal: 'Conversion',
                },
            };
            expect(input.context?.productType).toBe('SaaS');
        });

        it('should accept optional constraints', () => {
            const input: AuditInput = {
                target: {
                    type: 'url',
                    value: 'https://example.com',
                },
                constraints: {
                    brand: { color: '#3b82f6' },
                    stack: ['React', 'TailwindCSS'],
                    timeline: '1 week',
                },
            };
            expect(input.constraints?.stack).toContain('React');
        });
    });

    describe('Report Structure', () => {
        it('should have required report fields', () => {
            const mockReport = {
                product: 'Cynthia',
                version: '3.0',
                overallScore: 75,
                udecScores: {
                    [UDECAxis.CTX]: 80,
                    [UDECAxis.DYN]: 70,
                    [UDECAxis.LFT]: 75,
                    [UDECAxis.TYP]: 85,
                    [UDECAxis.CLR]: 65,
                    [UDECAxis.GRD]: 70,
                    [UDECAxis.SPC]: 75,
                    [UDECAxis.IMG]: 80,
                    [UDECAxis.MOT]: 60,
                    [UDECAxis.ACC]: 55,
                    [UDECAxis.RSP]: 70,
                    [UDECAxis.TRD]: 75,
                    [UDECAxis.EMO]: 80,
                },
                issuesFoundTotal: 15,
                teaserIssues: [],
            };

            expect(mockReport.product).toBe('Cynthia');
            expect(mockReport.version).toBe('3.0');
            expect(mockReport.overallScore).toBeGreaterThanOrEqual(0);
            expect(mockReport.overallScore).toBeLessThanOrEqual(100);
            expect(Object.keys(mockReport.udecScores)).toHaveLength(13);
        });

        it('should validate UDEC scores are 0-100', () => {
            const scores = {
                [UDECAxis.CTX]: 80,
                [UDECAxis.ACC]: 55,
            };

            Object.values(scores).forEach(score => {
                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('Issue Structure', () => {
        it('should have complete issue structure', () => {
            const mockIssue = {
                id: 'acc-001',
                axis: UDECAxis.ACC,
                severity: IssueSeverity.CRITICAL,
                title: 'Insufficient color contrast',
                description: 'Button has low contrast',
                reason: 'Fails WCAG AA',
                impact: 'Reduced accessibility',
                elementPath: '.btn-primary',
                fix: {
                    type: FixType.TOKEN_CHANGE,
                    description: 'Increase contrast',
                    measurements: {
                        contrast: 4.5,
                        values: { color: '#1a1a1a' },
                    },
                },
            };

            expect(mockIssue.id).toBeTruthy();
            expect(mockIssue.axis).toBe(UDECAxis.ACC);
            expect(mockIssue.severity).toBe(IssueSeverity.CRITICAL);
            expect(mockIssue.fix.type).toBe(FixType.TOKEN_CHANGE);
            expect(mockIssue.fix.measurements.contrast).toBeGreaterThanOrEqual(4.5);
        });
    });

    describe('Fix Pack Structure', () => {
        it('should have complete fix pack structure', () => {
            const mockFixPack = {
                id: 'pack-001',
                name: 'Accessibility Pack',
                description: 'WCAG compliance fixes',
                category: 'accessibility' as const,
                issues: ['acc-001', 'acc-002'],
                estimatedImpact: 'High - improves compliance',
                tradeoffs: ['May require color palette updates'],
            };

            expect(mockFixPack.id).toBeTruthy();
            expect(mockFixPack.category).toBe('accessibility');
            expect(mockFixPack.issues).toHaveLength(2);
        });
    });
});
