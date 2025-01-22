import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { useToast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';

const ProfileButton = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPremium, setIsPremium] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        let intervalId: Timer;

        const checkPremiumStatus = async () => {
            try {
                const res:
                    | {
                          success: boolean;
                          error?: string;
                      }
                    | undefined = await invokeMainChannel(MainChannels.CHECK_SUBSCRIPTION);
                console.log('Res:', res);
                if (res?.success) {
                    setIsPremium(true);
                    clearInterval(intervalId);
                }
            } catch (error) {
                console.error('Error checking premium status:', error);
            }
        };

        intervalId = setInterval(checkPremiumStatus, 15000);
        checkPremiumStatus(); // Initial check

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const handlePayment = async () => {
        try {
            const res:
                | {
                      success: boolean;
                      error?: string;
                  }
                | undefined = await invokeMainChannel(MainChannels.CREATE_STRIPE_CHECKOUT);
            if (res?.success) {
                toast({
                    variant: 'default',
                    title: 'Checkout successful!',
                    description: 'You will now have access to the premium features.',
                });
                setIsPremium(true);
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not initiate checkout process. Please try again.',
            });
            console.error('Payment error:', error);
        }
    };
    return (
        <Button
            variant="outline"
            className={cn('text-sm mx-2', isPremium ? 'border-green-500' : 'border-red-500')}
            onClick={handlePayment}
        >
            {isPremium ? 'Premium' : 'Upgrade to Premium'}
        </Button>
    );
};

export default ProfileButton;
