import { useUserManager } from '@/components/Context';
import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { PublishDropdown } from './Dropdown';
import { PublishButton } from './TriggerButton';

const Publish = observer(() => {
    const userManager = useUserManager();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        userManager.subscription.getPlanFromServer();
    }, [isOpen]);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <PublishButton />
            <DropdownMenuContent align="end" className="w-96 p-0 text-sm">
                <PublishDropdown setIsOpen={setIsOpen} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

export default Publish;
