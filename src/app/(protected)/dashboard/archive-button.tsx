// archive-button.tsx
import useProject from "@/hooks/use-project";
import useRefetch from "@/hooks/use-refetch";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ArchiveButton = () => {
  const archiveProject = api.project.archiveProject.useMutation();
  const { projectId } = useProject();
  const refetch = useRefetch();

  return (
    <Button
      disabled={archiveProject.isPending}
      size="sm"
      variant="destructive"
      onClick={() => {
        const confirm = window.confirm("Are you sure?");

        if (confirm) {
          archiveProject.mutate(
            { projectId },
            {
              onSuccess: () => {
                toast.success("Project archived");
                refetch();
              },
              onError: () => {
                toast.error("Failed to archive project");
              },
            },
          );
        }
      }}
    >
      Archive
    </Button>
  );
};

export default ArchiveButton;
