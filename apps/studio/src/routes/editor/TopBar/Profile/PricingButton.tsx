import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@onlook/ui/dialog';
import PricingPage from './PricingPage';

const PricingButton = () => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    $$$ Plans
                </Button>
            </DialogTrigger>
            <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none">
                <PricingPage />
            </DialogContent>
        </Dialog>
    );
};

export default PricingButton;
