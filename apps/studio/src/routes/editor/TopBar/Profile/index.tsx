import UserProfileDropdown from '@/components/ui/UserProfileDropdown';
import { Dialog, DialogContent, DialogTrigger } from '@onlook/ui/dialog';
import { DropdownMenuItem } from '@onlook/ui/dropdown-menu';
import PricingPage from './PricingPage';

const PricingButton = () => {
    return (
        <div className="ml-1">
            <Dialog>
                <UserProfileDropdown imageClassName="w-7 h-7">
                    <DialogTrigger asChild>
                        <DropdownMenuItem>Plans</DropdownMenuItem>
                    </DialogTrigger>
                </UserProfileDropdown>
                <DialogContent className="w-screen h-screen max-w-none m-0 p-0 rounded-none">
                    <PricingPage />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PricingButton;
