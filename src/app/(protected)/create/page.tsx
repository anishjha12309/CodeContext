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

type FormInput = {
  repoUrl: string;
  projectName: string;
  githubToken?: string;
};

const CreatePage = () => {
  const { register, handleSubmit, reset, watch } = useForm<FormInput>();
  const refetch = useRefetch();
  const router = useRouter();
  const { setProjectId } = useProject();
  const createProject = api.project.createProject.useMutation();
  const [isIndexing, setIsIndexing] = useState(false);
  const projectName = watch("projectName");

  function onSubmit(data: FormInput) {
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
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatePage;

