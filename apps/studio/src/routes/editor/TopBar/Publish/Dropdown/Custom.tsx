import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';

export const CustomDomainSection = observer(() => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center w-full">
                <h3 className="">Custom Domain</h3>
                <span className="ml-auto rounded bg-blue-400 text-white px-1.5 py-0.5 text-xs">
                    PRO
                </span>
            </div>

            <Button className="w-full rounded-md p-3 mb-4 bg-blue-400">Link a Custom Domain</Button>
        </div>
    );
});
