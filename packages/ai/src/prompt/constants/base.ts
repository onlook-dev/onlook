import { PROJECT_ROOT_SIGNATURE } from './signatures';

const language = 'the same language they are using';

const projectRootPrefix = `The project root is: ${PROJECT_ROOT_SIGNATURE}`;

const BASE_PROMPTS = {
    language,
    projectRootPrefix,
};

export { BASE_PROMPTS };
