"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@onlook/ui/card";
import { cn } from "@onlook/ui/utils";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Icons } from "@onlook/ui/icons";
import { Input } from "@onlook/ui/input";

interface TemplateMeta {
    id: string;
    name: string;
    description: string;
    preview: string;
}

export default function TemplateGalleryPage() {
    const [templates, setTemplates] = useState<TemplateMeta[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState<string>("");

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await fetch("/api/templates");
                if (!res.ok) throw new Error(res.statusText);
                const data = (await res.json()) as TemplateMeta[];
                setTemplates(data);
            } catch (err) {
                setError("Failed to load templates");
            }
        };
        fetchTemplates();
    }, []);

    const filtered = templates?.filter((t) => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return (
            t.name.toLowerCase().includes(s) ||
            t.description.toLowerCase().includes(s)
        );
    });

    return (
        <div className="w-screen min-h-screen flex flex-col items-center gap-6 p-8 bg-background">
            <h1 className="text-2xl font-semibold">Template Gallery</h1>
            <div className="w-full max-w-4xl">
                <div className="relative">
                    <Input
                        placeholder="Search templates"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-8 h-10"
                    />
                    <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    {search && (
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setSearch("")}
                        >
                            <Icons.CrossS className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            {error && <p className="text-red-500">{error}</p>}
            {!templates && !error ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Icons.Shadow className="h-5 w-5 animate-spin" /> Loading templates...
                </div>
            ) : (
                <div
                    className={cn(
                        "grid w-full max-w-6xl gap-6",
                        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                    )}
                >
                    {filtered?.map((t) => (
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
            )}
        </div>
    );
} 