import { Card } from '@/components/ui/card';
import { DownloadIcon, FilePlusIcon } from '@radix-ui/react-icons';
import { CreateMethod } from '@/routes/projects/helpers';

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
                <h1 className="text-title1 text-text-active leading-none">{'Projects'}</h1>
                <p className="text-text text-regular">{OPENING_MESSAGE}</p>
            </div>
            <div className="flex flex-row w-full gap-8">
                <Card
                    className="w-full border border-blue-800 bg-blue-900/50 hover:bg-blue-900 hover:border-blue-600 hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-8 transition"
                    onClick={() => {
                        setCreateMethod(CreateMethod.NEW);
                    }}
                >
                    <div className="rounded-full p-2 bg-blue-500">
                        <FilePlusIcon className="w-4 h-4 text-blue-100" />
                    </div>
                    <h3 className="text-regular font-medium pt-2 text-blue-100">
                        {'New Onlook project'}
                    </h3>
                    <p className="text-small text-blue-300"> {'Start a React App'} </p>
                </Card>
                <Card
                    className="w-full border border-teal-800 bg-teal-950 hover:bg-teal-800 hover:border-teal-600 hover:cursor-pointer flex flex-col items-center justify-center space-y-2 p-8 transition"
                    onClick={() => {
                        setCreateMethod(CreateMethod.LOAD);
                    }}
                >
                    <div className="rounded-full p-2 bg-teal-500">
                        <DownloadIcon className="w-4 h-4 text-teal-100" />
                    </div>
                    <h3 className="text-regular font-medium text-teal-100 pt-2">
                        {'Import existing project'}
                    </h3>
                    <p className="text-small text-teal-300">{'Work on your React UI'}</p>
                </Card>
            </div>
        </div>
    );
};
