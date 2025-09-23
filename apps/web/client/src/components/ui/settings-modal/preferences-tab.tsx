import { api } from '@/trpc/react';
import { observer } from 'mobx-react-lite';

export const PreferencesTab = observer(() => {
    const { data: settings } = api.user.settings.get.useQuery();
    const { mutate: updateSettings } = api.user.settings.upsert.useMutation();

    return (
        <div className="flex flex-col gap-8 p-6">

        </div>
    );
});