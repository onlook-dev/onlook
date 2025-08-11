'use client';

import { api } from '@/trpc/react';
import { Icons } from '@onlook/ui/icons';
import Link from 'next/link';
import { useMemo, useState, useRef, useEffect } from 'react';
import type { Project } from '@onlook/models';
import { motion, AnimatePresence } from 'motion/react';
import { EditAppButton } from './edit-app';
import { Settings } from './settings';
import { timeAgo } from '@onlook/utility';
import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';

// Subtle text emphasis for search matches (no background highlight)
function HighlightText({ text, searchQuery }: { text: string; searchQuery: string }) {
  if (!searchQuery) return <>{text}</>;
  const safe = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${safe})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <span key={index} className="font-medium text-foreground">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

// Square project card for horizontal rail
function SquareProjectCard({ 
  project, 
  searchQuery = "", 
  HighlightText 
}: { 
  project: Project; 
  searchQuery?: string; 
  HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
}) {
  const [img, setImg] = useState<string | null>(null);

  const handleClick = () => {
    // Navigate to project or open project
    // Project opening is handled by EditAppButton component
  };

  useEffect(() => {
    let isMounted = true;
    const preview = project.metadata?.previewImg;
    if (!preview) return;
    if (preview.type === 'url' && preview.url) {
      if (isMounted) setImg(preview.url);
    } else {
      const path = preview.storagePath?.path ?? '';
      if (!path) return;
      const bucket = preview.storagePath?.bucket ?? STORAGE_BUCKETS.PREVIEW_IMAGES;
      const url = getFileUrlFromStorage(bucket, path);
      if (isMounted) setImg(url ?? null);
    }
    return () => {
      isMounted = false;
    };
  }, [project.metadata?.previewImg]);

  return (
    <div
      className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group"
      onClick={handleClick}
    >
      <div className="w-full aspect-[4/2.8] rounded-lg overflow-hidden relative shadow-sm transition-all duration-300">
        {/* Background image */}
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Edit button center overlay */}
        <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <EditAppButton project={project} />
        </div>

        {/* Text overlay at bottom - clean, no gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="text-white font-medium text-sm mb-1 truncate drop-shadow-lg">
            {HighlightText ? (
              <HighlightText text={project.name} searchQuery={searchQuery} />
            ) : (
              project.name
            )}
          </div>
          {project.metadata?.description && (
            <div className="text-white/70 text-xs line-clamp-1 drop-shadow-lg">
              {HighlightText ? (
                <HighlightText text={project.metadata.description} searchQuery={searchQuery} />
              ) : (
                project.metadata.description
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Project card for masonry grid
function ProjectCard({ 
  project, 
  refetch, 
  aspectRatio = "aspect-[4/2.6]", 
  searchQuery = "", 
  HighlightText 
}: { 
  project: Project; 
  refetch: () => void; 
  aspectRatio?: string; 
  searchQuery?: string;
  HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
}) {
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const preview = project.metadata?.previewImg;
    if (!preview) return;
    if (preview.type === 'url' && preview.url) {
      if (isMounted) setImg(preview.url);
    } else {
      const path = preview.storagePath?.path ?? '';
      if (!path) return;
      const bucket = preview.storagePath?.bucket ?? STORAGE_BUCKETS.PREVIEW_IMAGES;
      const url = getFileUrlFromStorage(bucket, path);
      if (isMounted) setImg(url ?? null);
    }
    return () => {
      isMounted = false;
    };
  }, [project.metadata?.previewImg]);

  const lastUpdated = useMemo(() => timeAgo(new Date(project.metadata.updatedAt).toISOString()), [project.metadata.updatedAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="w-full break-inside-avoid cursor-pointer"
    >
      <div className={`relative ${aspectRatio} rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group`}>
        {/* Background image */}
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Three-dot menu - top right */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <Settings project={project} refetch={refetch} />
        </div>
        
        {/* Edit button center overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 hover:opacity-100 transition-opacity">
          <EditAppButton project={project} />
        </div>

        {/* Text overlay at bottom - clean, no gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-white font-medium text-sm mb-1 truncate drop-shadow-lg">
            {HighlightText ? (
              <HighlightText text={project.name} searchQuery={searchQuery} />
            ) : (
              project.name
            )}
          </div>
          <div className="text-white/80 text-xs mb-1 drop-shadow-lg">Last edited {lastUpdated}</div>
          {project.metadata?.description && (
            <div className="text-white/70 text-xs line-clamp-1 drop-shadow-lg">
              {HighlightText ? (
                <HighlightText text={project.metadata.description} searchQuery={searchQuery} />
              ) : (
                project.metadata.description
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Simple masonry layout with random aspect ratios
function MasonryLayout<T extends Project>({ items, spacing, renderItem }: {
  items: T[];
  spacing: number;
  renderItem: (item: T, aspectRatio?: string, searchQuery?: string) => React.ReactNode;
}) {
  const aspectRatios = [
    "aspect-[4/2.5]", "aspect-[4/3]", "aspect-[4/3.5]", "aspect-[4/4.5]",
    "aspect-[4/2.8]", "aspect-[4/5]", "aspect-[4/2.2]", "aspect-[4/3.8]",
  ];

  const getAspectRatio = (item: T) => {
    const id = item.id;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return aspectRatios[Math.abs(hash) % aspectRatios.length];
  };

  return (
    <div className="w-full" style={{ columnCount: 3, columnGap: `${spacing}px` }}>
      {items.map((item) => (
        <div key={item.id} style={{ breakInside: "avoid", marginBottom: `${spacing}px` }}>
          {renderItem(item, getAspectRatio(item))}
        </div>
      ))}
    </div>
  );
}

export const SelectProject = ({ externalSearchQuery }: { externalSearchQuery?: string } = {}) => {
  const { data: fetchedProjects, isLoading, refetch } = api.project.list.useQuery();
  const [internalQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchQuery = externalSearchQuery ?? internalQuery;
  const [spacing] = useState<number>(24);
  const [sortBy, setSortBy] = useState("Last viewed");
  const [orderBy, setOrderBy] = useState("Newest first");
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const projects: Project[] = fetchedProjects ?? [];

  const filteredAndSortedProjects = useMemo(() => {
    // Filter projects based on debounced search query
    let filtered = projects;
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = projects.filter((p) =>
        [p.name, p.metadata?.description ?? "", p.sandbox?.url ?? ""].some((s) =>
          (s ?? "").toLowerCase().includes(q),
        ),
      );
    }

    // Sort projects based on current sort criteria
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "Alphabetical":
          return a.name.localeCompare(b.name);
        
        case "Date created":
          return new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
        
        case "Last viewed":
        default:
          return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
      }
    });

    // Apply order (oldest/newest first)
    if (orderBy === "Oldest first") {
      return sorted.reverse();
    }
    
    return sorted;
  }, [projects, debouncedSearchQuery, sortBy, orderBy]);

  const sortOptions = [
    { value: "Alphabetical", label: "Alphabetical" },
    { value: "Date created", label: "Date created" },
    { value: "Last viewed", label: "Last viewed" },
  ];

  const orderOptions = [
    { value: "Oldest first", label: "Oldest first" },
    { value: "Newest first", label: "Newest first" },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSettingsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center">
                <div className="flex flex-row items-center gap-2">
                    <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
                    <div className="text-lg text-foreground-secondary">Loading projects...</div>
                </div>
            </div>
        );
    }

  if (projects.length === 0) {
    return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="text-xl text-foreground-secondary">No projects found</div>
                    <div className="text-md text-foreground-tertiary">Create a new project to get started</div>
                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <Icons.ArrowLeft className="h-4 w-4" />
                            Back to home
                        </Link>
                    </div>
                </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col px-6 py-8">
      <div className="max-w-6xl w-full mx-auto">
        {/* Projects Section */}
        <div className="mb-12">
          <h2 className="text-2xl text-foreground font-normal mb-[12px]">
            Projects
          </h2>
          {/* Keep rail aligned with content by padding to the same grid gutter */}
          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none]">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  className="flex-shrink-0 w-72"
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
                  <SquareProjectCard 
                    project={project}
                    searchQuery={debouncedSearchQuery}
                    HighlightText={HighlightText}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Files Section */}
        <div>
          <div className="flex items-center justify-between mb-[12px]">
            <h2 className="text-2xl text-foreground font-normal">Files</h2>
            
            <div className="flex items-center gap-4">
              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <div
                  className="relative"
                  ref={settingsDropdownRef}
                >
                  <button
                    onClick={() =>
                      setIsSettingsDropdownOpen(!isSettingsDropdownOpen)
                    }
                    className="p-2 rounded transition-colors hover:bg-secondary hover:text-foreground text-foreground-tertiary"
                  >
                    <Icons.Gear className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {isSettingsDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-50"
                      >
                      <div className="p-2">
                        <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">
                          Sort by
                        </div>
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortBy(option.value);
                              setIsSettingsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${
                              sortBy === option.value
                                ? "text-foreground bg-secondary"
                                : "text-foreground-secondary"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}

                        <div className="border-t border-border my-2"></div>

                        <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">
                          Order
                        </div>
                        {orderOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setOrderBy(option.value);
                              setIsSettingsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${
                              orderBy === option.value
                                ? "text-foreground bg-secondary"
                                : "text-foreground-secondary"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                    </div>
                      </motion.div>
                        )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
                    </div>
          <MasonryLayout
            items={filteredAndSortedProjects}
            spacing={spacing}
            renderItem={(project: Project, aspectRatio?: string) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                refetch={refetch} 
                aspectRatio={aspectRatio}
                searchQuery={debouncedSearchQuery}
                HighlightText={HighlightText}
              />
            )}
          />
        </div>
      </div>
        </div>
    );
};
