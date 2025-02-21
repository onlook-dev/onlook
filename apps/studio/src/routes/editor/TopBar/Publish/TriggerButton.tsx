import { Button } from '@onlook/ui/button';
import { DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { observer } from 'mobx-react-lite';

export const PublishButton = observer(() => {
    return (
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
                Publish
            </Button>
        </DropdownMenuTrigger>
    );
});
