import { useEditorEngine } from '@/components/Context';
import UserProfileDropdown from '@/components/ui/UserProfileDropdown';
import { Dialog, DialogContent, DialogTrigger } from '@onlook/ui/dialog';
import { DropdownMenuItem } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import PricingPage from './PricingPage';

const PricingButton = observer(() => {
    const editorEngine = useEditorEngine();
    return (
        <div className="ml-1">
            <Dialog
                open={editorEngine.showPlans}
                onOpenChange={(open) => (editorEngine.showPlans = open)}
            >
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
});

export default PricingButton;
