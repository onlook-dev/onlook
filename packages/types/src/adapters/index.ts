import * as PropType from './props';

export { PropType };

export interface Prop {
    name: string;
    type: PropType.StringType | PropType.BooleanType | PropType.EnumType<string[]>;
}

export interface ComponentDescriptor {
    framework: 'react'; // TODO: support other frameworks
    name: string; // export name; e.g. "Button" ("default" for default export)
    sourceFilePath: string; // relative path to component e.g. "src/Button.tsx"
    props: Prop[];
    createRenderer: (element: HTMLElement) => ComponentRenderer;
}

export interface ComponentRenderer {
    render(props: Record<string, unknown>): Promise<void>;
    dispose(): void;
}
