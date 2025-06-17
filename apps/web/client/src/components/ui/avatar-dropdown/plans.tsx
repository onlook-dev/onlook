'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Progress } from '@onlook/ui/progress';

export const PlanSection = () => {
    // Example values; in a real app, these would be props or come from context/store
    const planName = "Free Plan";
    const planStatus = "Trial";
    const dailyUsed = 4;
    const dailyLimit = 5;
    const usagePercent = (dailyUsed / dailyLimit) * 100;

    return (
        <div className="p-4 w-full text-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <div className="text-sm">{planName}</div>
                    <div className="text-muted-foreground">{planStatus}</div>
                </div>
                <div className="text-right">
                    <div>{dailyUsed} <span className="text-muted-foreground">of</span> {dailyLimit}</div>
                    <div className="text-muted-foreground">daily chats used</div>
                </div>
            </div>
            <Progress value={usagePercent} className="w-full" />
            <Button className="w-full flex items-center justify-center gap-2 bg-blue-400 text-white hover:bg-blue-300" onClick={() => { }}>
                <Icons.Sparkles className="mr-1 h-4 w-4" /> Get more Credits
            </Button>
        </div>
    );
};