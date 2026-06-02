"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useRefetch() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await queryClient.refetchQueries();
  }, [queryClient]);
}
