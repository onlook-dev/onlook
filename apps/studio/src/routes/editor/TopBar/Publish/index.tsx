import { DropdownMenu, DropdownMenuContent } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';
import { PublishDropdown } from './Dropdown';
import { PublishButton } from './TriggerButton';

const Publish = observer(() => {
    return (
        <DropdownMenu>
            <PublishButton />
            <DropdownMenuContent align="end" className="w-96 p-0">
                <PublishDropdown />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});

export default Publish;
