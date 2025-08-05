export interface TemplateMeta {
    id: string;
    name: string;
    description: string;
    preview: string;
    tags: string[];
}

export const templates: TemplateMeta[] = [
    {
        id: "nextjs-blog",
        name: "Next.js Blog",
        description: "Starter blog with MDX & Tailwind",
        preview: "/assets/templates/nextjs-blog.png",
        tags: ["blog", "nextjs", "tailwind"],
    },
    {
        id: "saas-dashboard",
        name: "SaaS Dashboard",
        description: "Analytics dashboard layout",
        preview: "/assets/templates/saas-dashboard.png",
        tags: ["dashboard", "saas"],
    },
    {
        id: "landing-page",
        name: "Landing Page",
        description: "Product launch landing page",
        preview: "/assets/templates/landing.png",
        tags: ["landing", "marketing"],
    },
]; 