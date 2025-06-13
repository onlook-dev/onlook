import { NextResponse } from "next/server";

const templates = [
    {
        id: "nextjs-blog",
        name: "Next.js Blog",
        description: "Starter blog with MDX & Tailwind",
        preview: "/assets/templates/nextjs-blog.png",
    },
    {
        id: "saas-dashboard",
        name: "SaaS Dashboard",
        description: "Analytics dashboard layout",
        preview: "/assets/templates/saas-dashboard.png",
    },
    {
        id: "landing-page",
        name: "Landing Page",
        description: "Product launch landing page",
        preview: "/assets/templates/landing.png",
    },
];

export async function GET() {
    return NextResponse.json(templates);
} 