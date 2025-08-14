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
import TemplateCard from '@/components/templates/TemplateCard';
import TemplateModal from '@/components/templates/TemplateModal';

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
    router.push(`/project/${project.id}`);
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
        {img ? (
          <img src={img} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
        )}
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        
        <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <EditAppButton 
            project={project} 
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </div>
        
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
    router.push(`/project/${project.id}`);
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
        {img ? (
          <img src={img} alt={project.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
        )}
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <Settings project={project} refetch={refetch} />
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 hover:opacity-100 transition-opacity">
          <EditAppButton 
            project={project} 
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-white font-medium text-base mb-1 truncate drop-shadow-lg">
            {HighlightText ? (
              <HighlightText text={project.name} searchQuery={searchQuery} />
            ) : (
              project.name
            )}
          </div>
          <div className="text-white/70 text-xs mb-1 drop-shadow-lg flex items-center">
            <Icons.CounterClockwiseClock className="w-3.5 h-3.5 mr-1" />
            <span>Last edited {lastUpdated}</span>
          </div>
          {project.metadata?.description && (
            <div className="text-white/60 text-xs line-clamp-1 drop-shadow-lg">
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
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  
  const [filesSortBy, setFilesSortBy] = useState<'Alphabetical' | 'Date created' | 'Last viewed'>(
    'Last viewed',
  );
  const [filesOrderBy, setFilesOrderBy] = useState<'Newest first' | 'Oldest first'>('Newest first');
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<'masonry' | 'grid'>('masonry');
  
  // Template-related state
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [starredTemplates, setStarredTemplates] = useState<Set<string>>(
    new Set(["template-2", "template-5"])
  );

  // Template data
  const templatesData = [
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
      template.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );

    // Sort starred templates first
    const sorted = filtered.sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return 0;
    });

    return sorted.slice(0, 8); // Limit to 8 templates
  }, [debouncedSearchQuery, starredTemplates]);

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  
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

  const baseProjects: Project[] = fetchedProjects ?? [];
  
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<Project>>>({});

  useEffect(() => {
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent;
      const detail = (custom?.detail ?? {}) as Partial<Project> & { id?: string };
      const id = (detail as any).id ?? (detail as any).projectId;
      if (!id) return;
      setLocalOverrides((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...(detail as any),
          
          metadata: {
            ...(prev[id]?.metadata as any),
            ...(detail as any).metadata,
          },
        },
      }));
    };
    window.addEventListener('onlook_project_updated' as any, handler as EventListener);
    window.addEventListener('onlook_project_modified' as any, handler as EventListener);
    return () => {
      window.removeEventListener('onlook_project_updated' as any, handler as EventListener);
      window.removeEventListener('onlook_project_modified' as any, handler as EventListener);
    };
  }, []);

  
  const updateFunctionalDescription = (projectId: string, newDescription?: string) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        metadata: {
          ...((prev[projectId]?.metadata as any) ?? {}),
          description: newDescription ?? 'Edited just now',
        },
      },
    }));
  };

  const reorderRailSequence = (projectId: string) => {
    setLocalOverrides((prev) => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        metadata: {
          ...((prev[projectId]?.metadata as any) ?? {}),
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  };

  const onProjectModified = (projectId: string, newDescription?: string) => {
    updateFunctionalDescription(projectId, newDescription);
    reorderRailSequence(projectId);
  };

  
  const projects: Project[] = useMemo(() => {
    return baseProjects.map((p) => {
      const o = localOverrides[p.id] ?? {};
      const merged = {
        ...p,
        ...o,
        metadata: {
          ...p.metadata,
          ...(o as any).metadata,
        },
      } as Project;
      return merged;
    });
  }, [baseProjects, localOverrides]);

  const favoriteProjects = useMemo(() => projects.filter(p => favoriteIds.includes(p.id)), [projects, favoriteIds]);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = projects.filter((p) =>
        [p.name, p.metadata?.description ?? '', p.sandbox?.url ?? ''].some((s) =>
          (s ?? '').toLowerCase().includes(q),
        ),
      );
    }
    return [...filtered].sort((a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime());
  }, [projects, debouncedSearchQuery]);

  
  const filesProjects = useMemo(() => {
    let list = filteredAndSortedProjects;
    const sorted = [...list].sort((a, b) => {
      switch (filesSortBy) {
        case 'Alphabetical':
          return a.name.localeCompare(b.name);
        case 'Date created':
          return new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
        case 'Last viewed':
        default:
          return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
      }
    });
    return filesOrderBy === 'Oldest first' ? sorted.reverse() : sorted;
  }, [filteredAndSortedProjects, filesSortBy, filesOrderBy]);

  const sortOptions = [
    { value: 'Alphabetical', label: 'Alphabetical' },
    { value: 'Date created', label: 'Date created' },
    { value: 'Last viewed', label: 'Last viewed' },
  ] as const;

  const orderOptions = [
    { value: 'Oldest first', label: 'Oldest first' },
    { value: 'Newest first', label: 'Newest first' },
  ] as const;

  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSettingsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Template handlers
  const handleTemplateClick = (template: any) => {
    setSelectedTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setSelectedTemplate(null);
  };

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
  };

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
        
        <div className="mb-12">
          <h2 className="text-2xl text-foreground font-normal mb-[12px]">
            Recent projects
          </h2>
          
          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none]">
            {filteredAndSortedProjects.length === 0 ? (
              <div className="w-full flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="text-foreground-secondary text-base">No projects found</div>
                  <div className="text-foreground-tertiary text-sm">Try adjusting your search terms</div>
                </div>
              </div>
            ) : (
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
                
                <motion.div
                  key="create-tile"
                  className="flex-shrink-0 w-72"
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, delay: filteredAndSortedProjects.length * 0.1, ease: [0.25, 0.46, 0.45, 0.94] } }}
                  exit={{ opacity: 0, y: -20, filter: "blur(10px)", transition: { duration: 0.2 } }}
                  layout
                >
                  <Link href="/">
                    <div className="relative aspect-[4/2.8] rounded-lg border border-border bg-secondary/40 hover:bg-secondary transition-colors flex items-center justify-center">
                      <div className="flex flex-col items-center justify-center text-foreground-tertiary">
                        <Icons.Plus className="w-7 h-7 mb-1" />
                        <span className="text-sm">Create</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

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
                        onClick={() => handleTemplateClick(template)}
                      />
                    </motion.div>
                  ))}

                  {!debouncedSearchQuery && (
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
              ) : debouncedSearchQuery ? (
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

        <div>
          <div className="flex items-center justify-between mb-[12px]">
            <h2 className="text-2xl text-foreground font-normal">Projects</h2>
            <div className="flex items-center gap-2">
              
              <button
                onClick={() => setLayoutMode((m) => (m === 'masonry' ? 'grid' : 'masonry'))}
                className="p-2 rounded transition-colors hover:bg-secondary text-foreground-tertiary hover:text-foreground"
                aria-label="Toggle layout"
                title={layoutMode === 'masonry' ? 'Switch to grid' : 'Switch to masonry'}
              >
                {layoutMode === 'masonry' ? (
                  <Icons.ViewGrid className="w-5 h-5" />
                ) : (
                  <Icons.ListBullet className="w-5 h-5" />
                )}
              </button>

              
              <div className="relative" ref={settingsDropdownRef}>
                <button
                  onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                  className="p-2 rounded transition-colors hover:bg-secondary hover:text-foreground text-foreground-tertiary"
                  aria-haspopup="menu"
                  aria-expanded={isSettingsDropdownOpen}
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
                        <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">Sort by</div>
                        {sortOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setFilesSortBy(option.value);
                              setIsSettingsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${
                              filesSortBy === option.value ? 'text-foreground bg-secondary' : 'text-foreground-secondary'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}

                        <div className="border-t border-border my-2"></div>

                        <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">Order</div>
                        {orderOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setFilesOrderBy(option.value);
                              setIsSettingsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${
                              filesOrderBy === option.value ? 'text-foreground bg-secondary' : 'text-foreground-secondary'
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

          
          {layoutMode === 'masonry' ? (
            <MasonryLayout
              items={filesProjects}
              spacing={spacing}
              renderItem={(project: Project, aspectRatio?: string) => (
                <ProjectCard
                  key={`files-${project.id}`}
                  project={project}
                  refetch={refetch}
                  aspectRatio={aspectRatio}
                  searchQuery={debouncedSearchQuery}
                  HighlightText={HighlightText}
                />
              )}
            />
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filesProjects.map((project) => (
                <ProjectCard
                  key={`files-${project.id}`}
                  project={project}
                  refetch={refetch}
                  aspectRatio="aspect-[4/2.6]"
                  searchQuery={debouncedSearchQuery}
                  HighlightText={HighlightText}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {selectedTemplate && (
        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={handleCloseTemplateModal}
          title={selectedTemplate.title}
          description={selectedTemplate.description}
          image={selectedTemplate.image}
          isNew={selectedTemplate.isNew}
          isStarred={selectedTemplate.isStarred}
          onToggleStar={() => handleToggleStar(selectedTemplate.id)}
        />
      )}
        </div>
    );
};
