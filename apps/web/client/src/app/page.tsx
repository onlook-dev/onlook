'use client';

import { CreateManagerProvider } from '@/components/store/create';
import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { NonProjectSettingsModal } from '@/components/ui/settings-modal/non-project';
import { ExternalRoutes } from '@/utils/constants';
import { useEffect } from 'react';
import { AuthModal } from './_components/auth-modal';
import { Hero } from './_components/hero';
import { ContributorSection } from './_components/landing-page/contributor-section';
import { CTASection } from './_components/landing-page/cta-section';
import { FAQSection } from './_components/landing-page/faq-section';
import { ResponsiveMockupSection } from './_components/landing-page/responsive-mockup-section';
import { TestimonialsSection } from './_components/landing-page/testimonials-section';
import { WhatCanOnlookDoSection } from './_components/landing-page/what-can-onlook-do-section';
import { WebsiteLayout } from './_components/website-layout';

/**
 * 检测首页 URL 中的本地 Agent 连接参数
 * 如果存在 localAgent 参数，重定向到 /projects 页面处理
 * （因为创建项目需要登录，/projects 页面有登录检查和创建逻辑）
 */
function useLocalAgentRedirect() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        if (params.has('localAgent')) {
            // 将所有参数带到 /projects 页面
            window.location.href = `/projects?${params.toString()}`;
        }
    }, []);
}

export default function Main() {
    useLocalAgentRedirect();

    return (
        <CreateManagerProvider>
            <WebsiteLayout showFooter={true}>
                <div className="w-screen h-screen flex items-center justify-center" id="hero">
                    <Hero />
                </div>
                <ResponsiveMockupSection />
                {/* <CodeOneToOneSection /> */}
                <WhatCanOnlookDoSection />
                {/* <ObsessForHoursSection /> */}
                <ContributorSection />
                <TestimonialsSection />
                <FAQSection />
                <CTASection href={ExternalRoutes.BOOK_DEMO} />
                <AuthModal />
                <NonProjectSettingsModal />
                <SubscriptionModal />
            </WebsiteLayout >
        </CreateManagerProvider>
    );
}
