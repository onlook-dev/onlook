import { CreateMethod } from '@/routes/projects/helpers';
import { Card } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';

export const ChooseMethod = ({
    setCreateMethod,
}: {
    setCreateMethod: (method: CreateMethod | null) => void;
}) => {
    const MESSAGES = [
        "Ready to make some good lookin' apps",
        "What a week... right? Doesn't matter, let's build!",
        "These apps aren't gunna design themselves",
        'Time to unleash your inner designer',
        'Release your inner artist today',
        "Let's craft some beautiful UIs!",
        "*crackles knuckles* Let's get building!",
        'Another day another design',
        "Can't wait to see what you create!",
        "Let's design something fresh today",
        "Let's get to work",
        "What time is it? It's time to build!",
        "ಠ_ಠ   Why aren't you designing?   ಠ_ಠ",
    ];

    const OPENING_MESSAGE = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

    return (
        <div className="flex flex-col w-[40rem] gap-20 mt-40">
            <div className="gap-5 flex flex-col">
                <h1 className="text-title1 text-foreground-active leading-none">{'Projects'}</h1>
                <p className="text-foreground-onlook text-regular">{OPENING_MESSAGE}</p>
            </div>
            <div className="flex flex-row w-full gap-8">
                <Card
                    className="w-full border border-np-primary-card-border bg-np-primary-card-background hover:bg-np-primary-card-background-hover hover:border-np-primary-card-border-hover hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-8 transition"
                    onClick={() => {
                        setCreateMethod(CreateMethod.NEW);
                    }}
                >
                    <div className="rounded-full p-2 bg-np-primary-icon-background">
                        <Icons.FilePlus className="w-4 h-4 text-np-primary-icon-shape" />
                    </div>
                    <h3 className="text-regular font-medium pt-2 text-np-primary-card-text">
                        {'New Onlook project'}
                    </h3>
                    <p className="text-small text-np-primary-card-subtext">{'Start a React App'}</p>
                </Card>
                <Card
                    className="w-full border border-np-secondary-card-border bg-np-secondary-card-background hover:bg-np-secondary-card-background-hover hover:border-np-secondary-card-border-hover hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-8 transition"
                    onClick={() => {
                        setCreateMethod(CreateMethod.LOAD);
                    }}
                >
                    <div className="rounded-full p-2 bg-np-secondary-icon-background">
                        <Icons.Download className="w-4 h-4 text-np-secondary-icon-shape" />
                    </div>
                    <h3 className="text-regular font-medium text-np-secondary-card-text pt-2">
                        {'Import existing project'}
                    </h3>
                    <p className="text-small text-np-secondary-card-subtext">
                        {'Work on your React UI'}
                    </p>
                </Card>
            </div>
        </div>
    );
};
