import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow
} from "@onlook/ui/table";
import Link from "next/link";

const tiers: { tier: string, messages: string, price: string }[] = [
    { tier: 'Tier 1', messages: '100', price: '$20' },
    { tier: 'Tier 2', messages: '200', price: '$40' },
    { tier: 'Tier 3', messages: '400', price: '$80' },
    { tier: 'Tier 4', messages: '800', price: '$160' },
    { tier: 'Tier 5', messages: '1,200', price: '$240' },
];

export function TierPricingTable() {
    return (
        <div className="w-3/5 mt-20 flex flex-col gap-6">
            <h2 className="text-2xl">Pro Usage Pricing</h2>
            <div className="">
                Each tier has a set number of monthly messages.
            </div>
            <Table >
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Tier</TableHead>
                        <TableHead>Monthly Messages</TableHead>
                        <TableHead>Pricing per Month</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tiers.map((tier) => (
                        <TableRow key={tier.tier}>
                            <TableCell className="font-medium">{tier.tier}</TableCell>
                            <TableCell>{tier.messages}</TableCell>
                            <TableCell>{tier.price}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter className="bg-gray-900/50">
                    <TableRow>
                        <TableCell>Tier X</TableCell>
                        <TableCell>--</TableCell>
                        <TableCell><Link href="mailto:support@onlook.com" target="_blank" className="text-blue-500">Contact us </Link> for custom pricing and volume discounts</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    )
}
