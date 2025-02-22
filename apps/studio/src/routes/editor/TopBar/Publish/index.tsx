import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { PublishDropdown } from './Dropdown';
import { PublishButton } from './TriggerButton';

const Publish = observer(() => {
    const [isOpen, setIsOpen] = useState(true);

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
