import { Button } from '@/components/ui/button';
import { UpdateManager } from '@/lib/update';
import { DownloadIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';

const UpdateButton = observer(() => {
    const updateManager = new UpdateManager();

    return (
        updateManager.updateAvailable && (
            <Button
                variant={'secondary'}
                size={'sm'}
                className="bg-red-500 h-6 rounded-sm gap-2 transition"
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
