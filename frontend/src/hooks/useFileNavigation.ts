import { useState, useCallback } from "react";

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export const useFileNavigation = () => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "Files" }
  ]);

  const navigateToFolder = useCallback((folder: { _id?: string; id?: string; name: string }) => {
    const folderId = folder._id || folder.id || "";
    setCurrentFolderId(folderId);
    setBreadcrumbs(prev => [
      ...prev,
      { id: folderId || null, name: folder.name }
    ]);
  }, []);

  const navigateToParent = useCallback((index: number) => {
    if (index >= 0 && index < breadcrumbs.length) {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFolderId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
    }
  }, [breadcrumbs]);

  const goBack = useCallback(() => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFolderId(newBreadcrumbs[newBreadcrumbs.length - 1].id);
    }
  }, [breadcrumbs]);

  const resetNavigation = useCallback(() => {
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: "Files" }]);
  }, []);

  const navigateToRoot = useCallback(() => {
    resetNavigation();
  }, [resetNavigation]);

  return {
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    navigateToParent,
    goBack,
    resetNavigation,
    navigateToRoot,
    isAtRoot: breadcrumbs.length === 1
  };
};
