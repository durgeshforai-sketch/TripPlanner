import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DestinationArt } from "@/components/trip/destinationArt";
import { FitBadge } from "@/components/recommendations/fit";
import { requireMembership } from "@/lib/auth/session";
import { getLatestRun } from "@/lib/db/repo";
import { formatINR } from "@/lib/utils";
import { TRIP_STYLE_LABELS } from "@/types/preferences";
import type { RecommendationOption } from "@/types/recommendation";

export const metadata = { title: "Compare options" };

interface Row {
  label: string;
  render: (option: RecommendationOption) => React.ReactNode;
}

const ROWS: Row[] = [
  {
    label: "Dates",
    render: (option) =>
      `${format(parseISO(option.dates.start), "d MMM")} – ${format(parseISO(option.dates.end), "d MMM")}`,
  },
  { label: "Days", render: (option) => `${option.duration}` },
  {
    label: "Estimated budget",
    render: (option) =>
      option.estimatedBudget.perPersonMin === option.estimatedBudget.perPersonMax
        ? formatINR(option.estimatedBudget.perPersonMin)
        : `${formatINR(option.estimatedBudget.perPersonMin)} – ${formatINR(option.estimatedBudget.perPersonMax)}`,
  },
  {
    label: "Flights from",
    render: (option) =>
      option.flightSummary?.estimatedMinimumFlightCost
        ? formatINR(option.flightSummary.estimatedMinimumFlightCost)
        : "Not available",
  },
  {
    label: "Travel time",
    render: (option) => {
      const hours = (option.travelSummary?.perOrigin ?? [])
        .map((entry) => entry.durationMinutes)
        .filter((minutes): minutes is number => typeof minutes === "number")
        .map((minutes) => Math.round((minutes / 60) * 10) / 10);
      if (hours.length === 0) return "—";
      const min = Math.min(...hours);
      const max = Math.max(...hours);
      return min === max ? `${min}h` : `${min}–${max}h each way`;
    },
  },
  {
    label: "Trip style match",
    render: (option) =>
      option.topStyles.length === 0 ? (
        "—"
      ) : (
        <span className="flex flex-wrap gap-1.5">
          {option.topStyles.slice(0, 4).map((style) => (
            <Badge key={style} tone="neutral">
              {TRIP_STYLE_LABELS[style]}
            </Badge>
          ))}
        </span>
      ),
  },
  {
    label: "Members strongly aligned",
    render: (option) => (
      <span>
        {option.individualFit.filter((fit) => fit.status === "strong").length} of{" "}
        {option.memberCount}
      </span>
    ),
  },
  {
    label: "Key compromise",
    render: (option) => option.compromise ?? "Nothing significant",
  },
  {
    label: "Activities found",
    render: (option) =>
      option.activities.length === 0 ? "None yet" : `${option.activities.length} ideas`,
  },
];

export default async function ComparePage({ params }: PageProps<"/trip/[tripId]/compare">) {
  const { tripId } = await params;
  await requireMembership(tripId);

  const run = await getLatestRun(tripId);
  if (!run || run.options.length === 0) redirect(`/trip/${tripId}/results`);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/trip/${tripId}/results`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to options
      </Link>

      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Side by side</h1>
      <p className="mt-2 text-ink-soft">
        The same facts for every option, including the parts that do not flatter it.
      </p>

      {/* Desktop: one column per option. */}
      <div className="mt-8 hidden overflow-x-auto lg:block">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Comparison of the group&rsquo;s shortlisted trips</caption>
          <thead>
            <tr>
              <th scope="col" className="w-44 p-3 text-left align-bottom text-ink-faint">
                <span className="sr-only">Detail</span>
              </th>
              {run.options.map((option) => (
                <th key={option.id} scope="col" className="p-3 text-left align-bottom">
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <div className="relative h-20">
                      <DestinationArt destination={option.destination} />
                    </div>
                    <div className="p-3">
                      <p className="text-base font-semibold">{option.destination.name}</p>
                      <p className="text-xs font-normal text-ink-faint">
                        Works well for {option.membersSatisfied}/{option.memberCount}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className="border-t border-border p-3 text-left align-top font-medium text-ink-faint"
                >
                  {row.label}
                </th>
                {run.options.map((option) => (
                  <td key={option.id} className="border-t border-border p-3 align-top">
                    {row.render(option)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="border-t border-border p-3 text-left align-top font-medium text-ink-faint">
                Each person
              </th>
              {run.options.map((option) => (
                <td key={option.id} className="border-t border-border p-3 align-top">
                  <ul className="space-y-1.5">
                    {[...option.individualFit]
                      .sort((a, b) => a.score - b.score)
                      .map((fit) => (
                        <li key={fit.memberId} className="flex items-center justify-between gap-2">
                          <span>{fit.memberName}</span>
                          <FitBadge status={fit.status} />
                        </li>
                      ))}
                  </ul>
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3" />
              {run.options.map((option) => (
                <td key={option.id} className="p-3">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/trip/${tripId}/option/${option.id}`}>Open</Link>
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile and tablet: stacked sections, no horizontal squeeze. */}
      <div className="mt-8 space-y-5 lg:hidden">
        {run.options.map((option) => (
          <section key={option.id} className="card overflow-hidden">
            <div className="relative h-24">
              <DestinationArt destination={option.destination} />
            </div>
            <div className="p-5">
              <h2 className="text-lg font-semibold">{option.destination.name}</h2>
              <p className="text-sm text-ink-faint">
                Works well for {option.membersSatisfied}/{option.memberCount}
              </p>

              <dl className="mt-4 space-y-2 text-sm">
                {ROWS.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="shrink-0 text-ink-faint">{row.label}</dt>
                    <dd className="text-right">{row.render(option)}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                {[...option.individualFit]
                  .sort((a, b) => a.score - b.score)
                  .map((fit) => (
                    <li key={fit.memberId} className="flex items-center justify-between gap-2">
                      <span>{fit.memberName}</span>
                      <FitBadge status={fit.status} />
                    </li>
                  ))}
              </ul>

              <Button asChild variant="secondary" className="mt-5 w-full">
                <Link href={`/trip/${tripId}/option/${option.id}`}>Open the full plan</Link>
              </Button>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10">
        <Button asChild size="lg">
          <Link href={`/trip/${tripId}/decision`}>
            Go to the vote
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
