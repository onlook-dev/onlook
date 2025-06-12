import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@onlook/ui/accordion';
import Link from 'next/link';

const tiers: { tier: string; messages: string; price: string }[] = [
    { tier: 'Tier 1', messages: '100', price: '$20' },
    { tier: 'Tier 2', messages: '200', price: '$40' },
    { tier: 'Tier 3', messages: '400', price: '$80' },
    { tier: 'Tier 4', messages: '800', price: '$160' },
    { tier: 'Tier 5', messages: '1,200', price: '$240' },
];

export function TierPricingDropdown() {
    return (
        <div className="w-full max-w-xl mt-20 flex flex-col gap-6">
            <h2 className="text-2xl">Pro Usage Pricing</h2>
            <div>Each tier has a set number of monthly messages.</div>
            <Accordion type="single" collapsible className="border divide-y rounded-md">
                {tiers.map((tier) => (
                    <AccordionItem key={tier.tier} value={tier.tier}>
                        <AccordionTrigger className="flex items-center justify-between w-full p-4 text-left">
                            <span className="font-medium">{tier.tier}</span>
                            <span className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{tier.messages} msgs</span>
                                <span>{tier.price}</span>
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 text-sm text-foreground-secondary">
                            This tier includes {tier.messages} messages per month for {tier.price}.
                        </AccordionContent>
                    </AccordionItem>
                ))}
                <AccordionItem value="custom">
                    <AccordionTrigger className="flex items-center justify-between w-full p-4 text-left">
                        <span className="font-medium">Tier X</span>
                        <span className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>--</span>
                            <span>Custom</span>
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 text-sm text-foreground-secondary">
                        <Link href="mailto:support@onlook.com" target="_blank" className="text-blue-500">
                            Contact us
                        </Link>{' '}
                        for custom pricing and volume discounts
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
