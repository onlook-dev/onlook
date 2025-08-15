'use client';

import { Icons } from '@onlook/ui/icons';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TemplateCard } from './template-card';

interface Template {
    id: string;
    title: string;
    description: string;
    category: string;
    image: string;
    isNew: boolean;
    isStarred: boolean;
}

interface TemplatesProps {
    searchQuery: string;
    onTemplateClick: (template: Template) => void;
    onToggleStar: (templateId: string) => void;
}

export function Templates({ searchQuery, onTemplateClick, onToggleStar }: TemplatesProps) {
    const [starredTemplates, setStarredTemplates] = useState<Set<string>>(
        new Set(["template-2", "template-5"])
    );

    // Template data
    const templatesData: Template[] = [
        {
            id: "template-1",
            title: "Property Listing Page",
            description: "Complete property showcase with photo gallery, amenities, reviews, and booking widget.",
            category: "Listings",
            image: "/assets/site-version-1.png",
            isNew: true,
            isStarred: starredTemplates.has("template-1")
        },
        {
            id: "template-2",
            title: "Host Dashboard",
            description: "Comprehensive host management interface with bookings, earnings, and property analytics.",
            category: "Host Tools",
            image: "/assets/site-version-2.png",
            isNew: false,
            isStarred: starredTemplates.has("template-2")
        },
        {
            id: "template-3",
            title: "Guest Checkout Flow",
            description: "Streamlined booking process with payment options, guest details, and confirmation.",
            category: "Booking",
            image: "/assets/site-version-3.png",
            isNew: false,
            isStarred: starredTemplates.has("template-3")
        },
        {
            id: "template-4",
            title: "Search Results Page",
            description: "Advanced search interface with filters, map view, and property comparison features.",
            category: "Search",
            image: "/assets/site-version-4.png",
            isNew: true,
            isStarred: starredTemplates.has("template-4")
        },
        {
            id: "template-5",
            title: "Experience Booking",
            description: "Activity and tour booking template with availability calendar and group options.",
            category: "Experiences",
            image: "/assets/dunes-create-light.png",
            isNew: false,
            isStarred: starredTemplates.has("template-5")
        },
        {
            id: "template-6",
            title: "User Profile & Reviews",
            description: "Guest and host profile pages with review system, verification badges, and preferences.",
            category: "Profiles",
            image: "/assets/dunes-login-light.png",
            isNew: false,
            isStarred: starredTemplates.has("template-6")
        }
    ];

    // Filter templates based on search query
    const filteredTemplatesData = useMemo(() => {
        const filtered = templatesData.filter(
            (template) =>
                template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.category.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Sort starred templates first
        const sorted = filtered.sort((a, b) => {
            if (a.isStarred && !b.isStarred) return -1;
            if (!a.isStarred && b.isStarred) return 1;
            return 0;
        });

        return sorted.slice(0, 8); // Limit to 8 templates
    }, [searchQuery, starredTemplates]);

    const handleToggleStar = (templateId: string) => {
        setStarredTemplates((prev) => {
            const newStarred = new Set(prev);
            if (newStarred.has(templateId)) {
                newStarred.delete(templateId);
            } else {
                newStarred.add(templateId);
            }
            return newStarred;
        });
        onToggleStar(templateId);
    };

    return (
        <div className="mb-12">
            <h2 className="text-2xl text-foreground font-normal mb-[12px]">
                Templates
            </h2>

            <div
                className="flex gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] min-h-[120px]"
                role="region"
                aria-label="Template gallery"
            >
                <AnimatePresence mode="popLayout">
                    {filteredTemplatesData.length > 0 ? (
                        <>
                            {filteredTemplatesData.map((template, index) => (
                                <motion.div
                                    key={template.id}
                                    className="flex-shrink-0"
                                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        filter: "blur(0px)",
                                        transition: {
                                            duration: 0.4,
                                            delay: index * 0.1,
                                            ease: [0.25, 0.46, 0.45, 0.94],
                                        },
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: -20,
                                        filter: "blur(10px)",
                                        transition: { duration: 0.2 },
                                    }}
                                    layout
                                >
                                    <TemplateCard
                                        title={template.title}
                                        description={template.description}
                                        image={template.image}
                                        isNew={template.isNew}
                                        isStarred={template.isStarred}
                                        onToggleStar={() => handleToggleStar(template.id)}
                                        onClick={() => onTemplateClick(template)}
                                    />
                                </motion.div>
                            ))}

                            {!searchQuery && (
                                <motion.div
                                    className="flex-shrink-0"
                                    initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        filter: "blur(0px)",
                                        transition: {
                                            duration: 0.4,
                                            delay: filteredTemplatesData.length * 0.1,
                                            ease: [0.25, 0.46, 0.45, 0.94],
                                        },
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: -20,
                                        filter: "blur(10px)",
                                        transition: { duration: 0.2 },
                                    }}
                                    layout
                                >
                                    <Link href="/">
                                        <div className="w-80 h-24 bg-background border border-border rounded-xl hover:border-border/80 hover:bg-secondary transition-all duration-200 flex items-center justify-center group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/80 opacity-50" />
                                            <div className="relative z-10 flex flex-col items-center">
                                                <Icons.Plus className="w-6 h-6 text-foreground-tertiary group-hover:text-foreground-secondary transition-colors" />
                                                <span className="text-xs text-foreground-tertiary group-hover:text-foreground-secondary mt-1">
                                                    Add Template
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            )}
                        </>
                    ) : searchQuery ? (
                        <motion.div
                            className="flex flex-col items-center justify-center w-full py-12 text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="text-foreground-secondary mb-2 text-lg">
                                No templates found
                            </div>
                            <div className="text-foreground-tertiary text-sm">
                                Try adjusting your search terms
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="flex-shrink-0"
                            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                filter: "blur(0px)",
                                transition: {
                                    duration: 0.4,
                                    ease: [0.25, 0.46, 0.45, 0.94],
                                },
                            }}
                            exit={{
                                opacity: 0,
                                y: -20,
                                filter: "blur(10px)",
                                transition: { duration: 0.2 },
                            }}
                            layout
                        >
                            <Link href="/">
                                <div className="w-80 h-24 bg-background border border-border rounded-xl hover:border-border/80 hover:bg-secondary transition-all duration-200 flex items-center justify-center group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/80 opacity-50" />
                                    <div className="relative z-10 flex flex-col items-center">
                                        <Icons.Plus className="w-6 h-6 text-foreground-tertiary group-hover:text-foreground-secondary transition-colors" />
                                        <span className="text-xs text-foreground-tertiary group-hover:text-foreground-secondary mt-1">
                                            Add Template
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
