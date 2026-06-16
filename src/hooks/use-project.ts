"use client";
// Tracks the active project in localStorage so selection survives page refreshes.
// The project object is derived from the loaded list — no extra fetch needed.

import { useEffect } from "react";
import { api } from "@/trpc/react";
import { useLocalStorage } from "usehooks-ts";

export function useProject() {
  const { data: projects } = api.project.getProjects.useQuery();
  const [projectId, setProjectId] = useLocalStorage("codecontext-project-id", "");

  const project = projects?.find((p) => p.id === projectId);

  // Clear a stale selection once the list has loaded and the saved id isn't found
  // (e.g. project deleted, membership revoked, or account switched in this browser).
  useEffect(() => {
    if (projectId && projects && !project) setProjectId("");
  }, [projectId, projects, project, setProjectId]);

  return {
    projects: projects ?? [],
    project,
    projectId,
    setProjectId,
  };
}
