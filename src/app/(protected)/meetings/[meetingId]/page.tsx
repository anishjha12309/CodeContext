import React from "react";
import IssuesList from "./issues-list";

type Props = {
  params: Promise<{ meetingId: string }>;
};

const MeetingDetailsPage = async ({ params }: Props) => {
  const { meetingId } = await params;
  return (
    <div className="p-4">
      <IssuesList meetingId={meetingId} />
    </div>
  );
};

export default MeetingDetailsPage;
