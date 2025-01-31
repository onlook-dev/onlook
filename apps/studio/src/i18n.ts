import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            pricing: {
                plans: {
                    basic: {
                        name: 'Onlook Basic',
                        price: '$0/month',
                        description: 'Prototype and experiment in code with ease.',
                        features: [
                            'Visual code editor access',
                            'Unlimited projects',
                            '10 AI chat messages a day',
                            '50 AI messages a month',
                            'Limited to 1 screenshot per chat',
                        ],
                    },
                    pro: {
                        name: 'Onlook Pro',
                        price: '$20/month',
                        description: 'Creativity – unconstrained. Build stunning sites with AI.',
                        features: [
                            'Visual code editor access',
                            'Unlimited projects',
                            'Unlimited AI chat messages a day',
                            'Unlimited monthly chats',
                            'Multiple screenshots per chat',
                            '1 free custom domain hosted with Onlook',
                            'Priority support',
                        ],
                    },
                },
                titles: {
                    choosePlan: 'Choose your plan',
                    proMember: 'Thanks for being a Pro member!',
                },
                buttons: {
                    currentPlan: 'Current Plan',
                    getPro: 'Get Pro',
                    manageSubscription: 'Manage Subscription',
                },
                loading: {
                    checkingPayment: 'Checking for payment...',
                },
                toasts: {
                    checkingOut: {
                        title: 'Checking out',
                        description:
                            'You will now be redirected to Stripe to complete the payment.',
                    },
                    redirectingToStripe: {
                        title: 'Redirecting to Stripe',
                        description:
                            'You will now be redirected to Stripe to manage your subscription.',
                    },
                    error: {
                        title: 'Error',
                        description: 'Could not initiate checkout process. Please try again.',
                    },
                },
                footer: {
                    unusedMessages: "Unused chat messages don't rollover to the next month",
                },
            },
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
