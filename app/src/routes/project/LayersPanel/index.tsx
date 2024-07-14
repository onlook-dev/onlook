import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { clsx } from 'clsx';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { Tree } from 'react-arborist';

const LayersPanel = observer(() => {
    const onCreate = ({ parentId, index, type }) => {};
    const onRename = ({ id, name }) => {};
    const onMove = ({ dragIds, parentId, index }) => {};
    const onDelete = ({ ids }) => {};
    const [selectedId, setSelectedId] = useState();
    const treeRef = useRef();

    const data = [
        { id: '1', name: 'Unread' },
        { id: '2', name: 'Threads' },
        {
            id: '3',
            name: 'Chat Rooms',
            children: [
                { id: 'c1', name: 'General' },
                { id: 'c2', name: 'Random' },
                { id: 'c3', name: 'Open Source Projects' },
            ],
        },
        {
            id: '4',
            name: 'Direct Messages',
            children: [
                { id: 'd1', name: 'Alice' },
                { id: 'd2', name: 'Bob' },
                { id: 'd3', name: 'Charlie' },
            ],
        },
    ];

    function Node({ node, style, dragHandle }) {
        /* This node instance can do many things. See the API reference. */
        return (
            <div
                style={style}
                ref={dragHandle}
                className={clsx(
                    'flex flex-row items-center space-x-2 h-6 rounded-sm',
                    node.isSelected ? 'bg-stone-800 text-white' : 'hover:bg-stone-900',
                )}
                onClick={() => node.select()}
            >
                <span>
                    {node.isLeaf ? (
                        <div className="w-4"> </div>
                    ) : (
                        <div className="w-4 h-4" onClick={() => node.toggle()}>
                            {node.isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </div>
                    )}
                </span>
                <span>{node.data.name}</span>
            </div>
        );
    }

    return (
        <div className="flex w-60 min-w-60 text-xs p-4 text-white/60">
            <Tree
                ref={treeRef}
                initialData={data}
                openByDefault={false}
                overscanCount={1}
                width={208}
                indent={8}
                className="w-full"
                selection={selectedId}
                padding={8}
                rowHeight={24}
            >
                {Node}
            </Tree>
        </div>
    );
});

export default LayersPanel;
