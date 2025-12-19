'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Badge } from '@onlook/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

// Static demo data
const DEMO_DATA = {
    overallScore: 68,
    issuesFound: 36,
    teaserIssues: [
        {
            severity: 'critical',
            axis: 'ACC',
            title: 'Insufficient color contrast on CTA button',
            description: 'Primary CTA button has 3.2:1 contrast ratio',
            reason: 'Fails WCAG AA (4.5:1) - reduces visibility for users with low vision',
            impact: 'Lost conversions, accessibility compliance risk',
        },
        {
            severity: 'major',
            axis: 'TYP',
            title: 'Inconsistent heading hierarchy',
            description: 'H2 elements appear before H1 in visual order',
            reason: 'Confuses screen readers and breaks semantic structure',
            impact: 'Poor SEO, difficult navigation for assistive tech users',
        },
        {
            severity: 'major',
            axis: 'SPC',
            title: 'Inconsistent spacing rhythm',
            description: 'Spacing values range from 8px to 37px with no system',
            reason: 'Creates visual noise and unprofessional appearance',
            impact: 'Reduces trust and perceived quality',
        },
    ],
};

export function TeaserDemoSection() {
    const t = useTranslations('landing.demo');
    const tCynthia = useTranslations('help.cynthia');

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'destructive';
            case 'major':
                return 'default';
            case 'minor':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: 'easeOut',
            },
        },
    };

    return (
        <section
            id="demo"
            className="w-full py-24 px-4 bg-background-secondary/30"
        >
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">{t('title')}</h2>
                    <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
                        {t('unlockPrompt', { count: DEMO_DATA.issuesFound })}
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    className="space-y-6"
                >
                    {/* Score Card */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{t('overallScore')}</span>
                                    <div className="text-6xl font-bold text-primary">
                                        {DEMO_DATA.overallScore}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-foreground-secondary">
                                    {t('issuesFound', { count: DEMO_DATA.issuesFound })}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Issues Preview */}
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('topIssues')}</CardTitle>
                                <CardDescription>
                                    {tCynthia('issues.description')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {DEMO_DATA.teaserIssues.map((issue, index) => (
                                    <motion.div
                                        key={index}
                                        variants={itemVariants}
                                        className="space-y-2 rounded-lg border p-4 bg-background"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant={getSeverityColor(issue.severity)}>
                                                        {tCynthia(`severity.${issue.severity}`)}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {tCynthia(`axes.${issue.axis}`)}
                                                    </Badge>
                                                </div>
                                                <h4 className="font-semibold text-lg">{issue.title}</h4>
                                                <p className="text-sm text-foreground-secondary">
                                                    {issue.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1 pt-2">
                                            <p className="text-sm">
                                                <strong>{tCynthia('issues.whyMatters')}</strong>{' '}
                                                {issue.reason}
                                            </p>
                                            <p className="text-sm">
                                                <strong>{tCynthia('issues.impact')}</strong>{' '}
                                                {issue.impact}
                                            </p>
                                        </div>
                                        {/* Blurred fix section */}
                                        <div className="relative mt-3">
                                            <div className="blur-sm select-none pointer-events-none opacity-50">
                                                <p className="text-sm font-semibold">
                                                    {tCynthia('issues.fix')}
                                                </p>
                                                <p className="text-sm">
                                                    Increase button text color darkness to #1a1a1a...
                                                </p>
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Badge variant="secondary" className="px-4 py-2">
                                                    <Icons.Lock className="h-3 w-3 mr-1" />
                                                    Unlock to see fix
                                                </Badge>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Unlock CTA */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-primary/50 bg-primary/5">
                            <CardHeader>
                                <CardTitle>{tCynthia('unlock.title')}</CardTitle>
                                <CardDescription>{tCynthia('unlock.description')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <Icons.Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                        <span>{tCynthia('unlock.feature1')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Icons.Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                        <span>{tCynthia('unlock.feature2')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Icons.Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                        <span>{tCynthia('unlock.feature3')}</span>
                                    </li>
                                </ul>
                                <Button className="w-full" size="lg">
                                    {tCynthia('unlock.button')}
                                    <Icons.ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
