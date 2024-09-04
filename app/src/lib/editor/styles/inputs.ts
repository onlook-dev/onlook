import { Change } from '/common/actions';

export const constructChangeCurried =
    <T>(original: T) =>
    (updated: T): Change<T> => ({ original, updated });
