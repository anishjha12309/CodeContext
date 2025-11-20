import React from "react";
import IssuesList from "./issues-list";

type Props = {
  params: { meetingId: string };
};

const MeetingDetailsPage = ({ params }: Props) => {
  const { meetingId } = params;
  return (
    <div className="p-4">
      <IssuesList meetingId={meetingId} />
    </div>
  );
};

export default MeetingDetailsPage;
