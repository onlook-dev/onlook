export enum RouterType {
    APP = 'app',
    PAGES = 'pages',
}

export type RouterConfig = {
    type: RouterType;
    basePath: string;
};
