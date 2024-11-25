import { useState } from 'react';
import { EditorMode } from '@/lib/models';
import { Icons } from '@onlook/ui/icons';

interface ButtonConfig {
    mode: EditorMode;
    icon: React.FC;
    title: string;
    disabled: boolean;
}

interface DropElementProperties {
    tagName: string;
    styles: object;
    children: ButtonConfig[];
}

interface DropdownProps {
    mode: EditorMode;
    onButtonClick: (mode: EditorMode) => void;
    onDragStart: (e: React.DragEvent, mode: EditorMode, properties: DropElementProperties) => void;
}

const getDefaultProperties = (mode: EditorMode): DropElementProperties | undefined => {
    switch (mode) {
        case EditorMode.Dropdown:
            return {
                tagName: 'div',
                styles: {
                    width: '200px',
                    backgroundColor: '#000',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                    padding: '10px',
                    color: '#fff',
                },
                children: [
                    {
                        mode: EditorMode.INSERT_MAIN_BUTTON,
                        icon: Icons.Button,
                        title: 'Insert Button',
                        disabled: false,
                    },
                    {
                        mode: EditorMode.INSERT_MAIN_INPUT,
                        icon: Icons.Input,
                        title: 'Insert Input',
                        disabled: false,
                    },
                ],
            };
        default:
            return undefined;
    }
};

const Dropdown: React.FC<DropdownProps> = ({ mode, onButtonClick, onDragStart }) => {
    const [isOpen, setIsOpen] = useState(false);

    const properties = getDefaultProperties(mode);

    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleDragStart = (e: React.DragEvent, child: ButtonConfig) => {
        e.stopPropagation();
        if (!properties) {
            return;
        }

        const childProperties = {
            ...properties,
            mode: child.mode,
            tagName: 'button', // Define the tag being dragged
        };

        // Set drag data for the dragged item
        e.dataTransfer.setData('text/plain', child.mode);
        e.dataTransfer.setData('application/json', JSON.stringify(childProperties));
        e.dataTransfer.effectAllowed = 'move';

        onDragStart(e, child.mode, childProperties);
    };

    if (!properties) {
        return null;
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block' }} onClick={toggleDropdown}>
            <button
                onClick={toggleDropdown}
                style={{
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '0px solid #ccc',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <Icons.ChevronUp />
            </button>

            {isOpen && (
                <div
                    style={{
                        ...properties.styles,
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto',
                    }}
                    className="dropdown-menu"
                >
                    {properties.children.map((child: ButtonConfig, index) => (
                        <div key={index} style={{ marginBottom: '4px' }}>
                            <button
                                style={{
                                    padding: '10px',
                                    width: '100%',
                                    textAlign: 'left',
                                    backgroundColor: child.disabled ? '#333' : '#000',
                                    border: 'none',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: child.disabled ? 0.5 : 1,
                                    cursor: child.disabled ? 'not-allowed' : 'grab',
                                    color: '#fff',
                                }}
                                draggable={!child.disabled}
                                onDragStart={(e) => handleDragStart(e, child)}
                                disabled={child.disabled}
                            >
                                <child.icon style={{ fill: '#fff' }} />
                                <span style={{ marginLeft: '8px' }}>{child.title}</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
