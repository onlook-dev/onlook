import { useEditorEngine } from '@/components/Context';
import type { DomainSettings } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { UrlSection } from './Url';

const publishedAt = new Date().toISOString();

export const BaseDomainSection = observer(
    ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
        const editorEngine = useEditorEngine();
        const domain: DomainSettings | null = {
            url: '123456.onlook.live',
            type: 'base',
            publishedAt,
        };

        const renderNoDomain = () => {
            return (
                <>
                    <div className="flex items-center w-full">
                        <h3 className="">Base Domain</h3>
                    </div>

                    <Button className="w-full rounded-md p-3 bg-blue-400 hover:bg-blue-500">
                        Publish my site
                    </Button>
                </>
            );
        };

        const renderDomain = () => {
            if (!domain) {
                return 'Something went wrong';
            }

            return (
                <>
                    <div className="flex items-center w-full">
                        <h3 className="">Base Domain</h3>
                        <div className="ml-auto flex items-center gap-2">
                            <p className="text-green-400">Live</p>•
                            <p>Updated {timeAgo({ date: domain.publishedAt })}</p>
                        </div>
                    </div>
                    <div className="w-full">
                        <UrlSection url={domain.url} />
                    </div>
                </>
            );
        };

        return (
            <div className="p-4 flex flex-col items-center gap-2">
                {domain ? renderDomain() : renderNoDomain()}
            </div>
        );
    },
);
