export interface ComponentDefinition {
    id: string;
    name: string;
    category: string;
    description?: string;
    props: ComponentProp[];
    code: string;
    framework: string;
    tags: string[];
    isCustom: boolean;
}

export interface ComponentProp {
    name: string;
    type: PropType;
    required: boolean;
    defaultValue?: any;
    description?: string;
    options?: string[]; // For enum types
}

export interface ComponentCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    components: ComponentDefinition[];
}

export interface DragOperation {
    componentId: string;
    startPosition: { x: number; y: number };
    currentPosition: { x: number; y: number };
    isDragging: boolean;
}

export interface DropTarget {
    elementId: string;
    position: DropPosition;
    isValid: boolean;
}

export interface ComponentInsertResult {
    success: boolean;
    elementId?: string;
    error?: string;
}

export type PropType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'node' | 'enum';
export type DropPosition = 'before' | 'after' | 'inside' | 'replace';