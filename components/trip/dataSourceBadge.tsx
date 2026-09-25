import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Sample data is always labelled. The product would rather look unfinished than
 * let someone mistake a generated number for a live one.
 */
export function DemoBadge({ label = "Sample data" }: { label?: string }) {
  return (
    <Badge tone="partial">
      <FlaskConical className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );
}

export function LiveBadge({ checkedAt }: { checkedAt: string }) {
  const time = new Date(checkedAt);
  const formatted = Number.isNaN(time.getTime())
    ? "just now"
    : time.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return <Badge tone="good">Live price checked at {formatted}</Badge>;
}
