import type { FrameworkType, StyleSystemType } from '../types';

export interface ProjectStructure {
    framework: FrameworkType;
    styleSystem: StyleSystemType;
    buildTool: BuildToolType;
    packageManager: PackageManagerType;
    components: ComponentDefinition[];
    pages: PageDefinition[];
    assets: AssetReference[];
    config: ProjectConfig;
}

export interface ComponentDefinition {
    name: string;
    path: string;
    props: PropDefinition[];
    dependencies: string[];
    framework: FrameworkType;
}

export interface PageDefinition {
    name: string;
    path: string;
    route: string;
    components: string[];
}

export interface AssetReference {
    id: string;
    path: string;
    type: string;
}

export interface ProjectConfig {
    buildCommand: string;
    devCommand: string;
    outputDir: string;
    publicDir: string;
}

export interface PropDefinition {
    name: string;
    type: string;
    required: boolean;
    defaultValue?: unknown;
}

export interface BuildConfig {
    framework: FrameworkType;
    buildTool: BuildToolType;
    commands: {
        dev: string;
        build: string;
        start: string;
    };
}

export interface VisualStyles {
    [property: string]: string;
}

export interface StyleDefinitions {
    classes: Record<string, VisualStyles>;
    variables: Record<string, string>;
    imports: string[];
}

export type BuildToolType = 'vite' | 'webpack' | 'parcel' | 'rollup' | 'next' | 'nuxt' | 'angular-cli';
export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'bun';