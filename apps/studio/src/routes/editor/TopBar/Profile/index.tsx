import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { useToast } from '@onlook/ui/use-toast';

const ProfileButton = () => {
    const { toast } = useToast();
    const handlePayment = async () => {
        try {
            const url: string | undefined = await invokeMainChannel(
                MainChannels.CREATE_CHECKOUT_URL,
            );
            console.log(url);
            if (url) {
                window.open(url, '_blank');
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
        <Button variant="outline" className="text-sm border-red-600 mx-2" onClick={handlePayment}>
            Upgrade to Premium
        </Button>
    );
};

export default ProfileButton;
