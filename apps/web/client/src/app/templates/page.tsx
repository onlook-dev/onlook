"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@onlook/ui/card";
import { cn } from "@onlook/ui/utils";
import Link from "next/link";
import Image from "next/image";

// TODO: Replace with real API call in subtask 2
const mockTemplates = [
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

export default function TemplateGalleryPage() {
    return (
        <div className="w-screen min-h-screen flex flex-col items-center gap-6 p-8 bg-background">
            <h1 className="text-2xl font-semibold">Template Gallery</h1>
            <div
                className={cn(
                    "grid w-full max-w-6xl gap-6",
                    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                )}
            >
                {mockTemplates.map((t) => (
                    <Link key={t.id} href={`/templates/${t.id}`} className="group">
                        <Card className="hover:shadow-md transition-shadow h-full">
                            <CardHeader className="border-b">
                                <CardTitle>{t.name}</CardTitle>
                                <CardDescription>{t.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative w-full aspect-video overflow-hidden rounded-md border">
                                    <Image
                                        src={t.preview}
                                        alt={`${t.name} preview`}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        className="object-cover"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
} 