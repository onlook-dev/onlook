import type { TipsPromptId } from '@studio/events';
import type { StringKey } from '@studio/i18n';

export type PromptTab = 'featured' | 'canvas' | 'pages' | 'styles';
export type PromptId = TipsPromptId;

export interface TipPrompt {
  id: PromptId;
  category: PromptTab;
  tint: string;
  title: StringKey;
  blurb: StringKey;
  body: StringKey;
  tries: readonly StringKey[];
}

export const PROMPTS: readonly TipPrompt[] = [
  {
    id: 'text',
    category: 'canvas',
    tint: '#1f4a44',
    title: 'tips.prompt.text.title',
    blurb: 'tips.prompt.text.blurb',
    body: 'tips.prompt.text.body',
    tries: ['tips.prompt.text.try1', 'tips.prompt.text.try2', 'tips.prompt.text.try3'],
  },
  {
    id: 'routes',
    category: 'pages',
    tint: '#22345a',
    title: 'tips.prompt.routes.title',
    blurb: 'tips.prompt.routes.blurb',
    body: 'tips.prompt.routes.body',
    tries: ['tips.prompt.routes.try1', 'tips.prompt.routes.try2', 'tips.prompt.routes.try3'],
  },
  {
    id: 'vars',
    category: 'featured',
    tint: '#4a2c52',
    title: 'tips.prompt.vars.title',
    blurb: 'tips.prompt.vars.blurb',
    body: 'tips.prompt.vars.body',
    tries: ['tips.prompt.vars.try1', 'tips.prompt.vars.try2', 'tips.prompt.vars.try3'],
  },
  {
    id: 'ds',
    category: 'styles',
    tint: '',
    title: 'tips.prompt.ds.title',
    blurb: 'tips.prompt.ds.blurb',
    body: 'tips.prompt.ds.body',
    tries: ['tips.prompt.ds.try1', 'tips.prompt.ds.try2', 'tips.prompt.ds.try3'],
  },
  {
    id: 'page',
    category: 'canvas',
    tint: '',
    title: 'tips.prompt.page.title',
    blurb: 'tips.prompt.page.blurb',
    body: 'tips.prompt.page.body',
    tries: ['tips.prompt.page.try1', 'tips.prompt.page.try2', 'tips.prompt.page.try3'],
  },
  {
    id: 'compare',
    category: 'canvas',
    tint: '#1d3f4f',
    title: 'tips.prompt.compare.title',
    blurb: 'tips.prompt.compare.blurb',
    body: 'tips.prompt.compare.body',
    tries: ['tips.prompt.compare.try1', 'tips.prompt.compare.try2'],
  },
  {
    id: 'mobile',
    category: 'pages',
    tint: '#2b4a2e',
    title: 'tips.prompt.mobile.title',
    blurb: 'tips.prompt.mobile.blurb',
    body: 'tips.prompt.mobile.body',
    tries: ['tips.prompt.mobile.try1', 'tips.prompt.mobile.try2'],
  },
  {
    id: 'tidy',
    category: 'canvas',
    tint: '#4d3a24',
    title: 'tips.prompt.tidy.title',
    blurb: 'tips.prompt.tidy.blurb',
    body: 'tips.prompt.tidy.body',
    tries: ['tips.prompt.tidy.try1', 'tips.prompt.tidy.try2', 'tips.prompt.tidy.try3'],
  },
  {
    id: 'ref',
    category: 'styles',
    tint: '',
    title: 'tips.prompt.ref.title',
    blurb: 'tips.prompt.ref.blurb',
    body: 'tips.prompt.ref.body',
    tries: ['tips.prompt.ref.try1', 'tips.prompt.ref.try2', 'tips.prompt.ref.try3'],
  },
  {
    id: 'refLayout',
    category: 'styles',
    tint: '',
    title: 'tips.prompt.refLayout.title',
    blurb: 'tips.prompt.refLayout.blurb',
    body: 'tips.prompt.refLayout.body',
    tries: ['tips.prompt.refLayout.try1', 'tips.prompt.refLayout.try2', 'tips.prompt.refLayout.try3'],
  },
  {
    id: 'refColor',
    category: 'styles',
    tint: '',
    title: 'tips.prompt.refColor.title',
    blurb: 'tips.prompt.refColor.blurb',
    body: 'tips.prompt.refColor.body',
    tries: ['tips.prompt.refColor.try1', 'tips.prompt.refColor.try2', 'tips.prompt.refColor.try3'],
  },
  {
    id: 'empty',
    category: 'pages',
    tint: '',
    title: 'tips.prompt.empty.title',
    blurb: 'tips.prompt.empty.blurb',
    body: 'tips.prompt.empty.body',
    tries: ['tips.prompt.empty.try1', 'tips.prompt.empty.try2', 'tips.prompt.empty.try3'],
  },
  {
    id: 'flow',
    category: 'pages',
    tint: '',
    title: 'tips.prompt.flow.title',
    blurb: 'tips.prompt.flow.blurb',
    body: 'tips.prompt.flow.body',
    tries: ['tips.prompt.flow.try1', 'tips.prompt.flow.try2', 'tips.prompt.flow.try3'],
  },
  {
    id: 'harmonize',
    category: 'styles',
    tint: '',
    title: 'tips.prompt.harmonize.title',
    blurb: 'tips.prompt.harmonize.blurb',
    body: 'tips.prompt.harmonize.body',
    tries: ['tips.prompt.harmonize.try1', 'tips.prompt.harmonize.try2', 'tips.prompt.harmonize.try3'],
  },
  {
    id: 'states',
    category: 'styles',
    tint: '',
    title: 'tips.prompt.states.title',
    blurb: 'tips.prompt.states.blurb',
    body: 'tips.prompt.states.body',
    tries: ['tips.prompt.states.try1', 'tips.prompt.states.try2', 'tips.prompt.states.try3'],
  },
  {
    id: 'showcase',
    category: 'styles',
    tint: '',
    title: 'tips.prompt.showcase.title',
    blurb: 'tips.prompt.showcase.blurb',
    body: 'tips.prompt.showcase.body',
    tries: ['tips.prompt.showcase.try1', 'tips.prompt.showcase.try2', 'tips.prompt.showcase.try3'],
  },
];

/** The Featured tab's order; every prompt appears in it. */
export const FEATURED: readonly PromptId[] = ['ref', 'refLayout', 'refColor', 'states', 'routes', 'vars', 'ds', 'showcase', 'harmonize', 'mobile', 'tidy', 'text', 'page', 'empty', 'flow', 'compare'];

export const TABS: readonly { id: PromptTab; label: StringKey }[] = [
  { id: 'featured', label: 'tips.tab.featured' },
  { id: 'canvas', label: 'tips.tab.canvas' },
  { id: 'pages', label: 'tips.tab.pages' },
  { id: 'styles', label: 'tips.tab.styles' },
];

export function promptsFor(tab: PromptTab): readonly TipPrompt[] {
  if (tab !== 'featured') return PROMPTS.filter((p) => p.category === tab);
  return FEATURED.map((id) => PROMPTS.find((p) => p.id === id)).filter((p): p is TipPrompt => p !== undefined);
}
