import type { UserChatMessageImpl } from '@/lib/editor/engine/chat/message/user';
import { getTruncatedFileName } from '@/lib/utils';
import type { ChatMessageContext } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import React from 'react';

const FILE_ICONS: { [key: string]: React.ComponentType } = {
    file: Icons.File,
    image: Icons.Image,
    selected: Icons.Code,
};

const UserMessage = ({ message }: { message: UserChatMessageImpl }) => {
    const [buttonHover, setButtonHover] = React.useState(false);

    function getTruncatedName(context: ChatMessageContext) {
        let name = context.name;
        if (context.type === 'file' || context.type === 'image') {
            name = getTruncatedFileName(name);
        }
        return name.length > 20 ? `${name.slice(0, 20)}...` : name;
    }

    return (
        <div className="relative group w-full flex flex-row justify-end px-2" key={message.id}>
            <div className="w-[90%] flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-primary">
                {message.context.length > 0 && (
                    <div className="flex flex-row w-full overflow-auto gap-3 text-micro mb-1.5 text-foreground-secondary">
                        {message.context.map((context) => (
                            <span className="flex flex-row gap-1 items-center" key={context.name}>
                                {React.createElement(FILE_ICONS[context.type])}
                                <span>{getTruncatedName(context)}</span>
                            </span>
                        ))}
                    </div>
                )}
                <div className="text-small">
                    {message.content.map((content) => (
                        <span key={content.text}>{content.text}</span>
                    ))}
                </div>
            </div>
            <Button
                onMouseEnter={() => setButtonHover(true)}
                onMouseLeave={() => setButtonHover(false)}
                className="group h-5 py-0 p-1 gap-1 bg-background-secondary hover:bg-background hover:border-border absolute -bottom-3 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
                <p
                    className={cn(
                        'overflow-hidden text-[9px] text-white transition-all duration-200',
                        buttonHover ? 'w-6' : 'w-0',
                    )}
                >
                    Edit
                </p>
                <Icons.Pencil className="w-3 h-3 text-foreground-primary" />
            </Button>
        </div>
    );
};

export default UserMessage;
