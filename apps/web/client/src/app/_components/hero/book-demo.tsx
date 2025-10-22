'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';

export function BookDemo() {
    const handleBookDemo = () => {
        // Open Calendly or demo booking link
        window.open('https://calendly.com/onlook/demo', '_blank', 'noopener,noreferrer');
    };

    return (
        <Button
            onClick={handleBookDemo}
            className="bg-foreground-primary text-background-primary hover:bg-foreground-hover"
        >
            Book a Demo
            <Icons.ArrowRight className="w-4 h-4" />
        </Button>
    );
}
