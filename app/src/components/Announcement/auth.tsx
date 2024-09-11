import { useAuthManager } from '@/App';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';

const Auth = observer(() => {
    const authManager = useAuthManager();
    const [userMetadata, setUserMetadata] = useState(authManager.userMetadata);

    useEffect(() => {
        setUserMetadata(authManager.userMetadata);
    }, [authManager.userMetadata]);

    return (
        <div className="flex flex-row gap-4 items-center justify-center">
            {userMetadata ? (
                <>
                    <div>Hello, {userMetadata.name}</div>
                    <Button variant={'outline'} onClick={() => authManager.signOut()}>
                        Sign Out
                    </Button>
                </>
            ) : (
                <>
                    <Button variant={'outline'} onClick={() => authManager.signIn('github')}>
                        Github
                    </Button>
                    <Button variant={'outline'} onClick={() => authManager.signIn('google')}>
                        Google
                    </Button>
                </>
            )}
        </div>
    );
});

export default Auth;
