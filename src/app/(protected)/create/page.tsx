"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useRefetch from "@/hooks/use-refetch";
import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { IndexingProgress } from "@/components/indexing-progress";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Coins } from "lucide-react";

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

const CREDITS_REQUIRED = 50;

const CreatePage = () => {
  const { register, handleSubmit, reset, watch } = useForm<FormInput>();
  const refetch = useRefetch();
  const router = useRouter();
  const { setProjectId } = useProject();
  const createProject = api.project.createProject.useMutation();
  const { data: credits, isLoading: creditsLoading } = api.project.getMyCredits.useQuery();
  const [isIndexing, setIsIndexing] = useState(false);
  const projectName = watch("projectName");

  const hasEnoughCredits = (credits ?? 0) >= CREDITS_REQUIRED;

  function onSubmit(data: FormInput) {
    if (!hasEnoughCredits) {
      toast.error(`You need ${CREDITS_REQUIRED} credits to create a project.`);
      return;
    }
    setIsIndexing(true);
    createProject.mutate(
      {
        githubUrl: data.repoUrl,
        name: data.projectName,
        githubToken: data.githubToken,
      },
      {
        onSuccess: (project) => {
          setIsIndexing(false);
          toast.success("Project created successfully!");
          // Set the newly created project as active
          setProjectId(project.id);
          refetch();
          reset();
          router.push("/dashboard");
        },
        onError: (error) => {
          setIsIndexing(false);
          toast.error(error.message || "Failed to create project.");
        },
      },
    );
    return true;
  }

  return (
    <>
      <IndexingProgress isActive={isIndexing} projectName={projectName} />
      
      <div className="flex h-full items-center justify-center gap-12">
        {/* <img src /> */}
        <div>
          <div>
            <h1 className="text-2xl font-semibold">
              Link your Github Repository
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter the URL of your repository to link it to CodeContext
            </p>
          </div>
          
          {/* Credit Status */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
            <Coins className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {creditsLoading ? "Loading..." : `${credits ?? 0} credits available`}
              </p>
              <p className="text-xs text-muted-foreground">
                {CREDITS_REQUIRED} credits required per project
              </p>
            </div>
            {!hasEnoughCredits && !creditsLoading && (
              <Link
                href="/billing"
                className="text-xs font-medium text-primary hover:underline"
              >
                Buy Credits
              </Link>
            )}
          </div>
          
          {!hasEnoughCredits && !creditsLoading && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">
                Insufficient credits. Please{" "}
                <Link href="/billing" className="font-medium underline">
                  purchase more credits
                </Link>{" "}
                to create a project.
              </p>
            </div>
          )}
          
          <div className="h-4"></div>
          <div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Input
                {...register("projectName", { required: true })}
                placeholder="Project Name"
                required
              />
              <div className="h-2"></div>
              <Input
                {...register("repoUrl", { required: true })}
                placeholder="Github URL"
                type="url"
                required
              />
              <div className="h-2"></div>
              <Input
                {...register("githubToken")}
                placeholder="Github Token (Optional)"
              />
              <div className="h-4"></div>
              <Button 
                type="submit" 
                disabled={createProject.isPending || !hasEnoughCredits || creditsLoading}
              >
                {createProject.isPending ? "Creating..." : `Create Project (${CREDITS_REQUIRED} credits)`}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatePage;


