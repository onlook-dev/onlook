export const rules = `IMPORTANT:
- The following is the first user message meant to set up the project from a blank slate.
- You will be given a prompt and you need to update a Next.js page that matches the prompt.
- Try to use a distinct style and infer it from the prompt. For example, if the prompt is for something artistic, you should make this look distinct based on the intent.
`;

export const defaultPath = 'app/page.tsx';

export const PAGE_SYSTEM_PROMPT = {
    rules,
    defaultPath,
};
