import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  isSystem?: boolean;
  systemContext?: string;
}

export const useFileNavigation = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "Files" },
  ]);
  const [highlightFileId, setHighlightFileId] = useState<string | null>(null);

  // Sync from URL on mount
  useEffect(() => {
    const urlFolderId = searchParams.get("folderId");
    const urlHighlight = searchParams.get("highlight");

    if (urlHighlight) {
      setHighlightFileId(urlHighlight);
    }

    if (urlFolderId && urlFolderId !== currentFolderId) {
      setCurrentFolderId(urlFolderId);
      // Breadcrumbs will be resolved by the page component via getFolderPath
    }
  }, []); // Only on mount

  const updateUrl = useCallback(
    (folderId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (folderId) {
        params.set("folderId", folderId);
      } else {
        params.delete("folderId");
      }
      params.delete("highlight");
      router.replace(`/files?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const navigateToFolder = useCallback(
    (folder: { _id?: string; id?: string; name: string }) => {
      const folderId = folder._id || folder.id || "";
      setCurrentFolderId(folderId);
      setBreadcrumbs((prev) => [
        ...prev,
        { id: folderId || null, name: folder.name },
      ]);
      setHighlightFileId(null);
      updateUrl(folderId);
    },
    [updateUrl]
  );

  const navigateToParent = useCallback(
    (index: number) => {
      if (index >= 0 && index < breadcrumbs.length) {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        const newFolderId = newBreadcrumbs[newBreadcrumbs.length - 1].id;
        setCurrentFolderId(newFolderId);
        setHighlightFileId(null);
        updateUrl(newFolderId);
      }
    },
    [breadcrumbs, updateUrl]
  );

  const goBack = useCallback(() => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      setBreadcrumbs(newBreadcrumbs);
      const newFolderId = newBreadcrumbs[newBreadcrumbs.length - 1].id;
      setCurrentFolderId(newFolderId);
      setHighlightFileId(null);
      updateUrl(newFolderId);
    }
  }, [breadcrumbs, updateUrl]);

  const resetNavigation = useCallback(() => {
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: "Files" }]);
    setHighlightFileId(null);
    updateUrl(null);
  }, [updateUrl]);

  const navigateToRoot = useCallback(() => {
    resetNavigation();
  }, [resetNavigation]);

  /**
   * Rebuilds breadcrumbs from a folder path array (from backend getFolderPath).
   */
  const setBreadcrumbsFromPath = useCallback(
    (path: { _id: string; name: string; isSystem?: boolean; systemContext?: string }[]) => {
      const crumbs: BreadcrumbItem[] = [{ id: null, name: "Files" }];
      for (const item of path) {
        crumbs.push({ id: item._id, name: item.name, isSystem: item.isSystem, systemContext: item.systemContext });
      }
      setBreadcrumbs(crumbs);
      if (path.length > 0) {
        setCurrentFolderId(path[path.length - 1]._id);
      }
    },
    []
  );

  return {
    currentFolderId,
    breadcrumbs,
    highlightFileId,
    navigateToFolder,
    navigateToParent,
    goBack,
    resetNavigation,
    navigateToRoot,
    setBreadcrumbsFromPath,
    setHighlightFileId,
    isAtRoot: breadcrumbs.length === 1,
  };
};
