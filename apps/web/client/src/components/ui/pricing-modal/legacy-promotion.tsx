import { useState } from 'react';
import { api } from '~/trpc/react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';

export const LegacyPromotion = () => {
    const { data: legacySubscriptions } = api.subscription.getLegacySubscriptions.useQuery();
    const code = legacySubscriptions?.stripePromotionCode;
    const [isCopied, setIsCopied] = useState(false);

    return (
        <AnimatePresence>
            {code && (
                <motion.div
                    className="rounded-md border border-blue-500 bg-blue-950 p-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <p className="text-left font-semibold text-blue-100">
                        Pro Desktop Users get 1 month free!
                    </p>

                    {/* Coupon Code Section */}
                    <p className="mb-3 text-left text-sm text-blue-200">
                        Use this code to redeem your free month of Tier 1 Pro
                    </p>

                    <div className="flex items-center justify-between rounded bg-blue-900 px-3 py-2">
                        <code className="mr-2 flex-1 truncate font-mono text-xs text-blue-100">
                            {code}
                        </code>
                        <Button
                            size="sm"
                            className="rounded-md bg-blue-500 text-white transition-all duration-300 hover:bg-blue-600"
                            onClick={() => {
                                navigator.clipboard.writeText(code);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 3000);
                                toast.success('Copied to clipboard');
                            }}
                        >
                            {isCopied ? (
                                <Icons.Check className="h-4 w-4" />
                            ) : (
                                <Icons.Copy className="h-4 w-4" />
                            )}
                            {isCopied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
