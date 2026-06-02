"use client";
// Tracks the active project in localStorage so selection survives page refreshes.
// The project object is derived from the loaded list — no extra fetch needed.

import { api } from "@/trpc/react";
import { useLocalStorage } from "usehooks-ts";

export function useProject() {
  const { data: projects } = api.project.getProjects.useQuery();
  const [projectId, setProjectId] = useLocalStorage("codecontext-project-id", "");

  const project = projects?.find((p) => p.id === projectId);

  return {
    projects: projects ?? [],
    project,
    projectId,
    setProjectId,
  };
}
