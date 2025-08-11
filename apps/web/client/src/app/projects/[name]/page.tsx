"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Icons } from "@onlook/ui/icons";
import { Button } from "@onlook/ui/button";
import { EditAppButton } from "../_components/edit-app";
import { Settings } from "../_components/settings";
import type { Project } from "@onlook/models";
import { api } from "@/trpc/react";
import Link from "next/link";
import { TopBar } from "../_components/top-bar";

// Lightweight project files list derived from existing project list
export default function ProjectDetailPage() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const decodedName = decodeURIComponent(params.name);

  const { data: projects = [] } = api.project.list.useQuery();
  const project = useMemo(() => projects.find((p) => p.name === decodedName), [projects, decodedName]);
  
  // Fetch components for this specific project
  const { data: projectComponents = [] } = api.project.getComponents.useQuery(
    { projectId: project?.id || "" },
    { enabled: !!project?.id }
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Last viewed");
  const [orderBy, setOrderBy] = useState("Newest first");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isStarred, setIsStarred] = useState<boolean>(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Favorites local storage helpers
  useEffect(() => {
    if (!project) return;
    try {
      const raw = localStorage.getItem("onlook_fav_projects") || "[]";
      const ids: string[] = JSON.parse(raw);
      setIsStarred(ids.includes(project.id));
    } catch {}
  }, [project?.id]);

  const toggleFavorite = () => {
    if (!project) return;
    try {
      const raw = localStorage.getItem("onlook_fav_projects") || "[]";
      const ids: string[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const set = new Set(ids);
      if (set.has(project.id)) {
        set.delete(project.id);
        setIsStarred(false);
      } else {
        set.add(project.id);
        setIsStarred(true);
      }
      localStorage.setItem("onlook_fav_projects", JSON.stringify(Array.from(set)));
      // notify other views
      window.dispatchEvent(new StorageEvent("storage", { key: "onlook_fav_projects" }));
      window.dispatchEvent(new Event("onlook_fav_projects_changed"));
    } catch {}
  };

  // Transform API response to match expected file format
  const projectFiles = useMemo(() => {
    if (!project || !projectComponents.length) return [];
    
    return projectComponents.map(component => ({
      id: component.id,
      name: component.name,
      projectName: project.name,
      projectId: project.id,
      lastModified: component.lastModified,
      type: component.type,
      preview: project.metadata?.previewImg,
      filePath: component.filePath,
      path: component.path
    }));
  }, [project, projectComponents]);

  const items = useMemo(() => {
    let filtered = projectFiles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = projectFiles.filter((f) => 
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
  }, [projectFiles, searchQuery, sortBy, orderBy]);

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Global top bar with centered expanding search */}
      <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Project header row */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Left controls: big back button + name + star */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="rounded-lg hover:bg-secondary text-foreground-tertiary hover:text-foreground p-3"
            aria-label="Back"
          >
            <Icons.ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-lg text-foreground font-medium truncate">{decodedName}</div>
          {project && (
            <button
              onClick={toggleFavorite}
              className="p-2 rounded hover:bg-secondary text-foreground-tertiary hover:text-foreground"
              aria-label={isStarred ? "Remove from favourites" : "Add to favourites"}
            >
              {isStarred ? (
                <Icons.BookmarkFilled className="w-5 h-5 text-yellow-400" />
              ) : (
                <Icons.Bookmark className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Right controls: Edit App -> Sort -> More */}
        <div className="flex items-center gap-2" ref={dropdownRef}>
          {project && <EditAppButton project={project} />}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen((v) => !v)}
              className="p-2 rounded hover:bg-secondary text-foreground-tertiary hover:text-foreground"
              aria-haspopup="menu"
              aria-expanded={isSettingsOpen}
              aria-label="Sort & Filter"
            >
              <Icons.MixerHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-50"
                >
                  <div className="p-2">
                    <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">Sort by</div>
                    {["Alphabetical", "Date created", "Last viewed"].map((value) => (
                      <button
                        key={value}
                        onClick={() => {
                          setSortBy(value);
                          setIsSettingsOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${sortBy === value ? "text-foreground bg-secondary" : "text-foreground-secondary"}`}
                      >
                        {value}
                      </button>
                    ))}
                    <div className="border-t border-border my-2" />
                    <div className="text-xs font-medium text-foreground-tertiary mb-2 px-2">Order</div>
                    {["Newest first", "Oldest first"].map((value) => (
                      <button
                        key={value}
                        onClick={() => {
                          setOrderBy(value);
                          setIsSettingsOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary transition-colors ${orderBy === value ? "text-foreground bg-secondary" : "text-foreground-secondary"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            className="p-2 rounded hover:bg-secondary text-foreground-tertiary hover:text-foreground"
            aria-label="More options"
          >
            <Icons.DotsHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Files grid (uses same card/preview pattern). Search lives in TopBar */}
      <div className="px-6 py-6 flex justify-center">
        <div className="max-w-6xl w-full">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-2xl text-foreground">Files</div>
            <div />
          </div>

          <div className="relative">
            <MasonryLayout
              items={items}
              spacing={24}
              renderItem={(file: any, aspectRatio?: string) => (
                <FileCard 
                  key={file.id} 
                  file={file} 
                  aspectRatio={aspectRatio}
                  searchQuery={searchQuery}
                  HighlightText={HighlightText}
                />
              )}
            />
            {items.length === 0 && (
              <div className="py-24 text-center text-foreground-tertiary">No files found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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

// File card with exact same design as the main projects page
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
    filePath?: string;
    path?: string;
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

  const lastUpdated = useMemo(() => {
    const date = new Date(file.lastModified);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }, [file.lastModified]);

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

// Simple masonry layout with random aspect ratios (same as main projects page)
function MasonryLayout<T extends { id: string }>({ items, spacing, renderItem }: {
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


