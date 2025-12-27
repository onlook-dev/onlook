'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Icons } from '@onlook/ui/icons';

const MotionDiv = motion.div;

interface SectionProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

function Section({ children, className = '', delay = 0 }: SectionProps) {
    return (
        <MotionDiv
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay, ease: 'easeOut' }}
            className={`w-full py-24 px-4 ${className}`}
        >
            {children}
        </MotionDiv>
    );
}

export function CreditBureauSection() {
    const t = useTranslations('landing.sections.creditBureau');

    return (
        <Section className="bg-background">
            <div className="max-w-5xl mx-auto text-center">
                <MotionDiv
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-6">{t('title')}</h2>
                    <p className="text-xl text-foreground-secondary mb-12 max-w-3xl mx-auto">
                        {t('body')}
                    </p>
                </MotionDiv>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 text-left">
                    {['bullet1', 'bullet2', 'bullet3', 'bullet4'].map((key, index) => (
                        <MotionDiv
                            key={key}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="flex items-start gap-4 p-6 rounded-lg border bg-background-secondary/50 hover:bg-background-secondary transition-colors"
                        >
                            <Icons.AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                            <p className="text-lg">{t(key as 'bullet1' | 'bullet2' | 'bullet3' | 'bullet4')}</p>
                        </MotionDiv>
                    ))}
                </div>
            </div>
        </Section>
    );
}

export function FixPacksSection() {
    const t = useTranslations('landing.sections.fixPacks');

    const fixPacks = [
        { icon: Icons.Layout, name: 'Layout Pack', color: 'text-blue-500' },
        { icon: Icons.Type, name: 'Type Pack', color: 'text-purple-500' },
        { icon: Icons.Palette, name: 'Color Pack', color: 'text-pink-500' },
        { icon: Icons.Space, name: 'Spacing Pack', color: 'text-green-500' },
        { icon: Icons.Accessibility, name: 'Accessibility Pack', color: 'text-orange-500' },
        { icon: Icons.Zap, name: 'Motion Pack', color: 'text-yellow-500' },
    ];

    return (
        <Section className="bg-background-secondary/30">
            <div className="max-w-5xl mx-auto text-center">
                <h2 className="text-4xl sm:text-5xl font-bold mb-4">{t('title')}</h2>
                <p className="text-xl text-foreground-secondary mb-12">{t('description')}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-12">
                    {fixPacks.map((pack, index) => {
                        const Icon = pack.icon;
                        return (
                            <MotionDiv
                                key={pack.name}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                whileHover={{ scale: 1.05 }}
                                className="flex flex-col items-center justify-center p-8 rounded-xl border bg-background hover:border-primary/50 transition-all cursor-pointer"
                            >
                                <Icon className={`h-10 w-10 ${pack.color} mb-4`} />
                                <p className="font-semibold">{pack.name}</p>
                            </MotionDiv>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
}

export function DesignSystemSection() {
    const t = useTranslations('landing.sections.designSystem');

    return (
        <Section className="bg-background">
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <MotionDiv
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">{t('title')}</h2>
                        <p className="text-xl text-foreground-secondary mb-8">{t('description')}</p>
                        <div className="space-y-4">
                            {['Token extraction', 'Violation detection', 'Regression prevention'].map(
                                (feature, index) => (
                                    <MotionDiv
                                        key={feature}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        className="flex items-center gap-3"
                                    >
                                        <Icons.Check className="h-5 w-5 text-primary flex-shrink-0" />
                                        <span className="text-lg">{feature}</span>
                                    </MotionDiv>
                                ),
                            )}
                        </div>
                    </MotionDiv>

                    <MotionDiv
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative"
                    >
                        <div className="aspect-square rounded-2xl border bg-gradient-to-br from-primary/5 to-background-secondary/50 flex items-center justify-center p-8">
                            <Icons.Shield className="h-32 w-32 text-primary/20" />
                        </div>
                    </MotionDiv>
                </div>
            </div>
        </Section>
    );
}

export function DeploySection() {
    const t = useTranslations('landing.sections.deploy');

    return (
        <Section className="bg-background-secondary/30">
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <MotionDiv
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative order-2 md:order-1"
                    >
                        <div className="aspect-square rounded-2xl border bg-gradient-to-br from-background-secondary/50 to-background p-8 flex items-center justify-center">
                            <Icons.Github className="h-32 w-32 text-foreground-secondary/40" />
                        </div>
                    </MotionDiv>

                    <MotionDiv
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="order-1 md:order-2"
                    >
                        <h2 className="text-4xl sm:text-5xl font-bold mb-6">{t('title')}</h2>
                        <p className="text-xl text-foreground-secondary mb-8">{t('description')}</p>
                        <div className="space-y-4">
                            {['Direct GitHub commits', 'Automated pull requests', 'One-click deploy'].map(
                                (feature, index) => (
                                    <MotionDiv
                                        key={feature}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                        className="flex items-center gap-3"
                                    >
                                        <Icons.Check className="h-5 w-5 text-primary flex-shrink-0" />
                                        <span className="text-lg">{feature}</span>
                                    </MotionDiv>
                                ),
                            )}
                        </div>
                    </MotionDiv>
                </div>
            </div>
        </Section>
    );
}

export function WhiteLabelSection() {
    const t = useTranslations('landing.sections.whiteLabel');

    return (
        <Section className="bg-background">
            <div className="max-w-5xl mx-auto text-center">
                <MotionDiv
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-6">{t('title')}</h2>
                    <p className="text-xl text-foreground-secondary mb-12 max-w-3xl mx-auto">
                        {t('description')}
                    </p>
                </MotionDiv>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                    {[
                        { icon: Icons.Palette, title: 'Custom Branding', desc: 'Your logo, your colors' },
                        { icon: Icons.Globe, title: 'Custom Domain', desc: 'audit.youragency.com' },
                        { icon: Icons.Users, title: 'Client Portals', desc: 'Branded client access' },
                    ].map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <MotionDiv
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="p-8 rounded-xl border bg-background-secondary/50 hover:bg-background-secondary transition-colors"
                            >
                                <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-foreground-secondary">{feature.desc}</p>
                            </MotionDiv>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
}
