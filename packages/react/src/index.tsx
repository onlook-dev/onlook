import React from "react";
import ReactDOM from "react-dom/client";
import type {
  ComponentDescriptor,
  ComponentRenderer,
  Prop,
} from "@onlook/types/adapters";
import {
  PropType,
} from "@onlook/types/adapters";

export class ReactRenderer implements ComponentRenderer {
  constructor(element: HTMLElement, ComponentDescriptor: React.ElementType) {
    this.root = ReactDOM.createRoot(element);
    this.component = ComponentDescriptor;
  }

  render(props: Record<string, unknown>) {
    return new Promise<void>((resolve) => {
      this.root.render(
        <div style={{ display: "contents" }} ref={() => resolve()}>
          <this.component {...props} />
        </div>
      );
    });
  }

  dispose() {
    this.root.unmount();
  }

  root: ReactDOM.Root;
  component: React.ElementType;
}

export function reactComponent<Props>({
  sourceFilePath,
  name = "default",
  component,
  props = PropType.object<{}>({}),
}: {
  sourceFilePath: string;
  name?: string;
  component: React.ComponentType<Props>;
  props?: PropType.ObjectType<Partial<Props>>;
}): ComponentDescriptor {
  return {
    framework: "react",
    sourceFilePath,
    name,
    props: Object.entries(props.props).map(([name, type]) => ({
      name: name,
      type: type as Prop["type"],
    })),
    createRenderer: (element: HTMLElement) =>
      new ReactRenderer(element, component),
  };
}

export * from "@onlook/types/adapters";
