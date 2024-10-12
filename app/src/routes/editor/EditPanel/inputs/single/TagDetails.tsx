import { useEditorEngine } from '@/components/Context';
import { TAG_INFO } from '@/lib/editor/styles/tag';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

type TagInfo = {
    title: string;
    description: string;
};

const TagDetails = observer(() => {
    const editorEngine = useEditorEngine();
    const tagName = editorEngine.elements.selected[0].tagName;
    const [showMore, setShowMore] = useState<boolean>(false);
    const [tagInfo, setTagInfo] = useState<TagInfo>({
        title: '',
        description: '',
    });

    useEffect(() => {
        const info = TAG_INFO[tagName.toLowerCase()] ?? {
            title: 'Element',
            description: '',
        };
        setTagInfo(info);
    }, [tagName]);

    const toggleShowMore = () => {
        setShowMore(!showMore);
    };

    return (
        <button
            className="text-start w-full p-2 mb-3 bg-background-onlook/75 rounded text-xs cursor-pointer overflow-hidden"
            onClick={toggleShowMore}
            style={{ transform: 'height 0.2s' }}
        >
            <p className="space-x-1">
                <span className="capitalize">{tagName.toLowerCase()}</span>
                <span>
                    {tagInfo.title.toLowerCase() === tagName.toLowerCase() ? '' : tagInfo.title}
                </span>
            </p>
            <motion.div
                initial={{ height: 0 }}
                animate={{ height: showMore ? 'auto' : 0 }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3 }}
            >
                <p className="pt-2 whitespace-pre-line">{tagInfo.description}</p>
                <p className="pt-2 text-xs underline">
                    <a
                        href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Learn more
                    </a>
                </p>
            </motion.div>
        </button>
    );
});

export default TagDetails;
