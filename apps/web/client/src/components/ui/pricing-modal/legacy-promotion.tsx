import { Button } from "@onlook/ui/button";
import { Icons } from "@onlook/ui/icons/index";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";

export const LegacyPromotion = () => {
    const { data: legacySubscriptions } = api.subscription.getLegacySubscriptions.useQuery();
    const code = legacySubscriptions?.stripePromotionCode;
    const [isCopied, setIsCopied] = useState(false);

    return (
        <AnimatePresence>
            {code && (
                <motion.div
                    className="border border-blue-500 rounded-md p-3 bg-blue-950"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <p className="text-blue-100 text-left font-semibold">
                        Pro Desktop Users get 1 month free!
                    </p>

                    {/* Coupon Code Section */}
                    <p className="text-sm text-left mb-3 text-blue-200">
                        Use this code to redeem your free month of Tier 1 Pro
                    </p>

                    <div className="flex items-center justify-between rounded px-3 py-2 bg-blue-900">
                        <code className="text-blue-100 text-xs font-mono truncate flex-1 mr-2">
                            {code}
                        </code>
                        <Button
                            size="sm"
                            className="hover:bg-blue-600 bg-blue-500 rounded-md text-white transition-all duration-300 "
                            onClick={() => {
                                navigator.clipboard.writeText(code);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 3000);
                                toast.success('Copied to clipboard');
                            }}
                        >
                            {isCopied ? <Icons.Check className="w-4 h-4" /> : <Icons.Copy className="w-4 h-4" />}
                            {isCopied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};