import { useUpdateManager } from '@/components/Context';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';

const UpdateButton = observer(() => {
    const updateManager = useUpdateManager();

    return (
        updateManager.updateAvailable && (
            <Button
                variant={'secondary'}
                size={'sm'}
                className={`bg-red-500 hover:bg-red-600 h-7 rounded-sm gap-2 transition ${updateManager.updateAvailable ? 'animate-wiggle' : ''} hover:animate-none`}
                onClick={() => {
                    updateManager.quitAndInstall();
                }}
            >
                <Icons.Download />
                <p>Install new Update</p>
            </Button>
        )
    );
});

export default UpdateButton;
