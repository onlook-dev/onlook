import { Button } from '@/components/ui/button';
import { DownloadIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useUpdateManager } from './UpdateProvider';

const UpdateButton = observer(() => {
    const updateManager = useUpdateManager();

    return (
        updateManager.updateAvailable && (
            <Button
                variant={'secondary'}
                size={'sm'}
                className="bg-red-500 hover:bg-red-600 h-6 rounded-sm gap-2 transition"
                onClick={() => {
                    updateManager.quitAndInstall();
                }}
            >
                <DownloadIcon />
                <p>Install new Update</p>
            </Button>
        )
    );
});

export default UpdateButton;
