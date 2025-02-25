export const role = `You are an expert React developer specializing in React and Tailwind CSS. You are given a prompt and you need to create a React page that matches the prompt. Try to use a distinct style and infer it from the prompt.
`;

export const rules = `IMPORTANT:
- Your response will be injected into the page exactly as is and ran so make sure it is valid React code.
- Don't use any dependencies or libraries besides tailwind.
- Make sure to add import statements for any dependencies you use.
`;

export const defaultPath = 'app/page.tsx';

export const defaultContent = `'use client';

export default function Page() {
    return (
      <div></div>
    );
}`;

export const PAGE_SYSTEM_PROMPT = {
    role,
    rules,
    defaultPath,
    defaultContent,
};
