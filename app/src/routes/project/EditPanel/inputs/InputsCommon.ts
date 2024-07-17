import { Change } from '/common/actions';

export type UpdateElementStyleCallback = (style: string, change: Change<string>) => void;
export const constructChangeCurried =
    <T>(original: T) =>
    (updated: T): Change<T> => ({ original, updated });
