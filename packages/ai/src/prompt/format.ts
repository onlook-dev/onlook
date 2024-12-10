const searchReplace = {
    start: '<<<<<<< SEARCH',
    middle: '=======',
    end: '>>>>>>> REPLACE',
} as const;

const code = {
    start: '```',
    end: '```',
} as const;

const FENCE = {
    searchReplace,
    code,
} as const;

export { FENCE };
