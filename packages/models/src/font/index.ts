export interface RawFont {
    id: string;
    family: string;
    subsets: string[];
    weights: string[];
    styles: string[];
    defSubset: string;
    variable: boolean;
    lastModified: string;
    category: string;
    type: string;
}

export interface FontConfig {
    path: string;
    weight: string;
    style: string;
}

export interface FontConfigFile {
    fontName: string;
    fontConfigs: FontConfig[];
}

export interface FontUploadFile {
    file: { name: string; buffer: number[] };
    name: string;
    weight: string;
    style: string;
}
