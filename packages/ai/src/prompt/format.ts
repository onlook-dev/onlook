const searchReplace = {
    start: '<<<<<<< SEARCH',
    middle: '=======',
    end: '>>>>>>> REPLACE',
};

const code = {
    start: '```',
    end: '```',
};

const FENCE = {
    searchReplace,
    code,
};

export { FENCE };
