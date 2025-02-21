import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';

export const BaseDomainSection = observer(() => {
    return (
        <div className="p-2 flex flex-col items-center justify-between gap-2">
            <h2 className="text-start w-full">Publish</h2>
            <Button className="w-full rounded-md p-3">Publish my site</Button>
        </div>
    );
});
