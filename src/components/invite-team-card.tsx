"use client";

import { useState } from "react";
import { Users, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function InviteTeamCard({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/join/${projectId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copyLink}
      className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
    >
      <Users className="h-4 w-4" />
      Invite team
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
