import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'deep' | 'frame' | 'paper' | 'faint' | 'ink';

export interface Box {
  readonly kind: 'row' | 'col';
  readonly gap?: number;
  readonly pad?: number;
  readonly grow?: number;
  readonly size?: number;
  readonly cross?: number;
  readonly align?: 'start' | 'center' | 'stretch' | 'end';
  readonly justify?: 'start' | 'center' | 'end' | 'between';
  readonly tone?: Tone;
  readonly stroke?: Tone;
  readonly children: readonly Node[];
}

export interface Leaf {
  readonly kind: 'block';
  readonly tone: Tone;
  readonly art?: ReactNode;
  readonly grow?: number;
  readonly size?: number;
  readonly cross?: number;
}

export type Node = Box | Leaf;

type BoxOptions = Omit<Box, 'kind' | 'children'>;

export const row = (options: BoxOptions, ...children: Node[]): Box => ({ kind: 'row', ...options, children });
export const col = (options: BoxOptions, ...children: Node[]): Box => ({ kind: 'col', ...options, children });
export const block = (tone: Tone, options: Omit<Leaf, 'kind' | 'tone'> = {}): Leaf => ({ kind: 'block', tone, ...options });
export const rep = (count: number, make: (index: number) => Node): Node[] => Array.from({ length: count }, (_, index) => make(index));

const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' } as const;
const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' } as const;
const CAP: CSSProperties = { minWidth: 0, minHeight: 0, maxWidth: '100%', maxHeight: '100%' };

function flex(grow: number | undefined, size: number | undefined, axis: 'row' | 'col', u: number): CSSProperties {
  if (grow !== undefined) return { flex: `${String(grow)} 1 0`, ...CAP };
  if (size !== undefined) return { flex: `0 1 ${String(size * u)}px`, ...(axis === 'row' ? { width: size * u } : { height: size * u }), ...CAP };
  return { flex: '0 1 auto', ...CAP };
}

function across(cross: number | undefined, axis: 'row' | 'col', u: number, self: 'center' | undefined): CSSProperties {
  if (cross === undefined) {
    if (self !== undefined) return {};
    return axis === 'row' ? { height: 'fit-content' } : { width: 'fit-content' };
  }
  return axis === 'row'
    ? { height: cross * u, maxHeight: '100%', alignSelf: self }
    : { width: cross * u, maxWidth: '100%', alignSelf: self };
}

/** Rows and columns on one unit `u` in px; every tone is painted from `inks`. */
export function Blocking({ tree, u, inks, radius }: { tree: Node; u: number; inks: Record<Tone, string>; radius: number }): React.JSX.Element {
  const draw = (node: Node, key: number, axis: 'row' | 'col', parentAlign: Box['align'] = 'stretch'): React.JSX.Element => {
    const self = parentAlign === 'stretch' ? 'center' : undefined;
    if (node.kind === 'block') {
      return (
        <span
          key={key}
          style={{
            background: inks[node.tone],
            borderRadius: radius,
            ...(node.art === undefined ? {} : { position: 'relative', overflow: 'hidden' }),
            ...flex(node.grow, node.size, axis, u),
            ...across(node.cross, axis, u, self),
          }}
        >
          {node.art}
        </span>
      );
    }
    return (
      <span
        key={key}
        style={{
          position: 'relative',
          display: 'flex',
          overflow: node.tone === undefined ? 'visible' : 'hidden',
          boxShadow: node.stroke === undefined ? undefined : `inset 0 0 0 1px ${inks[node.stroke]}`,
          flexDirection: node.kind === 'row' ? 'row' : 'column',
          gap: (node.gap ?? 1) * u,
          padding: (node.pad ?? 0) * u,
          alignItems: ALIGN[node.align ?? 'stretch'],
          justifyContent: JUSTIFY[node.justify ?? 'start'],
          background: node.tone === undefined ? undefined : inks[node.tone],
          borderRadius: node.tone === undefined ? undefined : radius,
          ...flex(node.grow, node.size, axis, u),
          ...across(node.cross, axis, u, self),
        }}
      >
        {node.children.map((child, index) => draw(child, index, node.kind, node.align ?? 'stretch'))}
      </span>
    );
  };
  return <span style={{ position: 'absolute', inset: 0, display: 'flex' }}>{draw({ ...tree, grow: tree.grow ?? 1 }, 0, 'row')}</span>;
}
