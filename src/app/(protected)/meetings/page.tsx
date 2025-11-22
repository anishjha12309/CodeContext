"use client";

import useProject from "@/hooks/use-project";
import { api } from "@/trpc/react";
import React from "react";
import MeetingCard from "../dashboard/meeting-card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useRefetch from "@/hooks/use-refetch";
import { Loader2 } from "lucide-react";

const MeetingsPage = () => {
  const { projectId } = useProject();
  const { data: meetings, isLoading } = api.project.getMeetings.useQuery(
    { projectId },
    { refetchInterval: 4000 },
  );
  const deleteMeeting = api.project.deleteMeeting.useMutation();
  const refetch = useRefetch();

  return (
    <>
      <MeetingCard />
      <div className="h-6"></div>

      <h1 className="text-xl font-semibold">Meetings</h1>

      {meetings && meetings.length === 0 && <div>No meetings found</div>}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-4 text-sm text-gray-500">Loading meetings...</p>
        </div>
      )}

      <ul className="divide-y divide-gray-200">
        {meetings?.map((meeting) => (
          <li
            key={meeting.id}
            className="flex flex-col items-start justify-between gap-4 py-5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/meetings/${meeting.id}`}
                    className="text-sm font-semibold"
                  >
                    {meeting.name}
                  </Link>

                  {meeting.status === "PROCESSING" && (
                    <Badge className="bg-black text-white">Processing...</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-x-2 text-xs text-gray-500">
                <p className="whitespace-nowrap">
                  {meeting.createdAt.toLocaleDateString()}
                </p>

                <p className="truncate">{meeting.issues.length} issues</p>
              </div>
            </div>
            <div className="flex w-full flex-none flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto">
              <Link
                href={`/meetings/${meeting.id}`}
                className="flex-1 sm:flex-none"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  View Meeting
                </Button>
              </Link>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  deleteMeeting.mutate(
                    { meetingId: meeting.id },
                    {
                      onSuccess: () => {
                        toast.success("Meeting deleted successfully");
                        refetch();
                      },
                    },
                  )
                }
                disabled={deleteMeeting.isPending}
                className="w-full flex-1 sm:w-auto sm:flex-none"
              >
                Delete Meeting
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};

export default MeetingsPage;
