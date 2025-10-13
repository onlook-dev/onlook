export const wrapXml = (name: string, content: string) => {
    return `<${name}>${content}</${name}>`;
};
