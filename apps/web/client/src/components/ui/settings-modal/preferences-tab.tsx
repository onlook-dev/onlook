import { observer } from 'mobx-react-lite';
import { UserDeleteSection } from './user-delete-section';

export const PreferencesTab = observer(() => {
    return (
        <div className="flex flex-col gap-8 p-6">
            <UserDeleteSection />
        </div>
    );
});