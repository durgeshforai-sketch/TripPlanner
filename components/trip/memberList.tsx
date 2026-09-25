import { Check, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Member } from "@/types/trip";

export interface MemberRow extends Member {
  hasSubmitted: boolean;
}

export function MemberList({
  members,
  meId,
  expected,
  showPending = true,
}: {
  members: MemberRow[];
  meId: string;
  expected: number;
  showPending?: boolean;
}) {
  const pending = Math.max(0, expected - members.length);

  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <li
          key={member.id}
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-border bg-surface p-3",
            member.id === meId && "border-primary/40 bg-primary-soft/40",
          )}
        >
          <Avatar name={member.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {member.name}
              {member.id === meId ? <span className="text-ink-faint"> (you)</span> : null}
            </p>
            <p className="text-xs text-ink-faint">
              {member.role === "owner" ? "Organiser" : "Joined"}
            </p>
          </div>
          {member.hasSubmitted ? (
            <Badge tone="strong">
              <Check className="h-3 w-3" aria-hidden />
              Done
            </Badge>
          ) : (
            <Badge tone="neutral">
              <Clock className="h-3 w-3" aria-hidden />
              Not yet
            </Badge>
          )}
        </li>
      ))}

      {showPending && pending > 0
        ? Array.from({ length: pending }, (_, index) => (
            <li
              key={`pending-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong p-3"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-xs text-ink-faint"
              >
                ?
              </span>
              <p className="flex-1 text-sm text-ink-faint">Waiting for someone to join</p>
              <Badge tone="neutral">Invited</Badge>
            </li>
          ))
        : null}
    </ul>
  );
}
