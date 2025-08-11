'use client';

import { api } from '@/trpc/react';
import { Icons } from '@onlook/ui/icons';
import Link from 'next/link';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const handleClick = () => {
    const slug = encodeURIComponent(project.name);
    router.push(`/projects/${slug}`);
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
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
        
        {/* Edit button center overlay (kept for parity; click-through also supported) */}
        <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <EditAppButton 
            project={project} 
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling to card click
            }}
          />
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

// File card for masonry grid - displays individual files
function FileCard({
  file,
  aspectRatio = "aspect-[4/2.6]",
  searchQuery = "",
  HighlightText
}: {
  file: {
    id: string;
    name: string;
    projectName: string;
    projectId: string;
    lastModified: string;
    type: 'component' | 'page';
    preview?: any;
  };
  aspectRatio?: string;
  searchQuery?: string;
  HighlightText?: React.ComponentType<{ text: string; searchQuery: string }>;
}) {
  const [img, setImg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    if (file.preview?.type === 'url' && file.preview.url) {
      if (isMounted) setImg(file.preview.url);
    }
    return () => {
      isMounted = false;
    };
  }, [file.preview]);

  const handleClick = () => {
    // Navigate to project editor for this specific file
    router.push(`/project/${file.projectId}`);
  };

  const lastUpdated = useMemo(() => timeAgo(file.lastModified), [file.lastModified]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="w-full break-inside-avoid cursor-pointer"
      onClick={handleClick}
    >
      <div className={`relative ${aspectRatio} rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group`}>
        {/* Background image */}
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={file.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* File type indicator */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
          {file.type}
        </div>

        {/* Text overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-white font-medium text-sm mb-1 truncate drop-shadow-lg">
            {HighlightText ? (
              <HighlightText text={file.name} searchQuery={searchQuery} />
            ) : (
              file.name
            )}
          </div>
          <div className="text-white/80 text-xs mb-1 drop-shadow-lg">Last edited {lastUpdated}</div>
          <div className="text-white/70 text-xs truncate drop-shadow-lg">
            {HighlightText ? (
              <HighlightText text={file.projectName} searchQuery={searchQuery} />
            ) : (
              file.projectName
            )}
          </div>
        </div>
      </div>
    </motion.div>
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
  const router = useRouter();

  const handleCardClick = () => {
    const slug = encodeURIComponent(project.name);
    router.push(`/projects/${slug}`);
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

  const lastUpdated = useMemo(() => timeAgo(new Date(project.metadata.updatedAt).toISOString()), [project.metadata.updatedAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="w-full break-inside-avoid cursor-pointer"
      onClick={handleCardClick}
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
          <EditAppButton 
            project={project} 
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling to card click
            }}
          />
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
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Favorites rail state from localStorage
  useEffect(() => {
    const readFavs = () => {
      try {
        const raw = localStorage.getItem('onlook_fav_projects') || '[]';
        const ids: string[] = JSON.parse(raw);
        if (Array.isArray(ids)) setFavoriteIds(ids);
      } catch {}
    };
    readFavs();
    const onChange = () => readFavs();
    window.addEventListener('storage', onChange);
    window.addEventListener('onlook_fav_projects_changed', onChange as EventListener);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('onlook_fav_projects_changed', onChange as EventListener);
    };
  }, []);

  const projects: Project[] = fetchedProjects ?? [];
  const favoriteProjects = useMemo(() => projects.filter(p => favoriteIds.includes(p.id)), [projects, favoriteIds]);

  // Get recent files from all projects for Files section
  const recentFiles = useMemo(() => {
    if (!projects.length) return [];
    
    // Create mock file data based on project frames/pages
    const files = projects.flatMap(project => [
      {
        id: `${project.id}-main`,
        name: 'HomePage.jsx',
        projectName: project.name,
        projectId: project.id,
        lastModified: project.metadata.updatedAt,
        type: 'component' as const,
        preview: project.metadata?.previewImg
      },
      {
        id: `${project.id}-dashboard`,
        name: 'Dashboard.jsx', 
        projectName: project.name,
        projectId: project.id,
        lastModified: new Date(new Date(project.metadata.updatedAt).getTime() - 1000 * 60 * 30).toISOString(), // 30 min ago
        type: 'page' as const,
        preview: project.metadata?.previewImg
      },
      {
        id: `${project.id}-login`,
        name: 'LoginPage.jsx',
        projectName: project.name, 
        projectId: project.id,
        lastModified: new Date(new Date(project.metadata.updatedAt).getTime() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        type: 'page' as const,
        preview: project.metadata?.previewImg
      }
    ]);

    // Sort by last modified and return most recent
    return files.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  }, [projects]);

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

  // Filter and sort files for Files section
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = recentFiles;
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = recentFiles.filter((f) =>
        [f.name, f.projectName].some((s) => s.toLowerCase().includes(q))
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "Alphabetical":
          return a.name.localeCompare(b.name);
        case "Date created":
        case "Last viewed":
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });

    return orderBy === "Oldest first" ? sorted.reverse() : sorted;
  }, [recentFiles, debouncedSearchQuery, sortBy, orderBy]);

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
        {/* Favorites Section */}
        {favoriteProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl text-foreground font-normal mb-[12px]">Favorites</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none]">
              <AnimatePresence mode="popLayout">
                {favoriteProjects.map((project) => (
                  <motion.div key={`fav-${project.id}`} className="flex-shrink-0 w-72" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <SquareProjectCard project={project} searchQuery={debouncedSearchQuery} HighlightText={HighlightText} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
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
            items={filteredAndSortedFiles}
            spacing={spacing}
            renderItem={(file: any, aspectRatio?: string) => (
              <FileCard 
                key={file.id} 
                file={file} 
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
