import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@onlook/ui/table";

const tiers = [
    { tier: 'Tier 1', messages: '100', pro: '$25' },
    { tier: 'Tier 2', messages: '200', pro: '$50' },
    { tier: 'Tier 3', messages: '400', pro: '$100' },
    { tier: 'Tier 4', messages: '800', pro: '$200' },
    { tier: 'Tier 5', messages: '1,200', pro: '$294' },
    { tier: 'Tier 6', messages: '2,000', pro: '$480' },
    { tier: 'Tier 7', messages: '3,000', pro: '$705' },
    { tier: 'Tier 8', messages: '4,000', pro: '$920' },
    { tier: 'Tier 9', messages: '5,000', pro: '$1,125' },
    { tier: 'Tier 10', messages: '7,500', pro: '/' },
    { tier: 'Tier 11', messages: '10,000', pro: '/' },
];

export function TierPricingTable() {
    return (
        <div className="w-3/5 mt-10 flex flex-col gap-6">
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
                            <TableCell>{tier.pro}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

