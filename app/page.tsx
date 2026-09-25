import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  MessageSquareOff,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/iconChip";
import { SiteFooter, SiteHeader } from "@/components/trip/brand";
import { TravellersScene } from "@/components/illustrations/scenes";
import { PRODUCT } from "@/lib/config";

const STEPS = [
  {
    icon: Users,
    tone: "primary" as const,
    title: "Everyone shares preferences",
    body: "Budget, dates, trip length and the things they will not compromise on. Five minutes each, on their own time.",
  },
  {
    icon: Scale,
    tone: "accent" as const,
    title: "We find the overlap",
    body: "Where the group agrees, where it does not, and which constraints are actually blocking a decision.",
  },
  {
    icon: CalendarCheck,
    tone: "strong" as const,
    title: "Your group gets 3 realistic options",
    body: "Each one with dates, cost, travel time and an honest note about who is compromising.",
  },
];

/** Illustrative, and labelled as such by the surrounding copy. */
const FIT_EXAMPLES = [
  { dot: "bg-strong", who: "Riya", text: "Strong fit — matches her budget and preferred dates." },
  { dot: "bg-good", who: "Siddharth", text: "Good fit — a day longer than he would pick." },
  { dot: "bg-partial", who: "Karan", text: "Partial — destination works, trip style does not." },
  { dot: "bg-notfit", who: "Aisha", text: "Not this time — she is away that weekend." },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="#how-it-works">How it works</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/create">Get started</Link>
          </Button>
        </div>
      </SiteHeader>

      <main id="main" className="flex-1">
        <section className="surface-gradient">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
            <div className="animate-rise">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-soft shadow-[0_1px_2px_rgba(23,20,58,0.04)]">
                <MessageSquareOff className="h-3.5 w-3.5 text-accent" aria-hidden />
                1,200 messages. Zero plans.
              </p>
              <h1 className="text-[2.6rem] leading-[1.04] sm:text-6xl">
                Turn group chaos
                <br />
                into <span className="text-gradient">one trip.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
                Everyone has a different budget, schedule and idea of fun. Put it all in one
                place and find the trips that actually work for everyone.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/create">
                    Plan a trip as a group
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/create?mode=join">Join a trip</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-ink-faint">
                No accounts. One link for the whole group.
              </p>
            </div>

            <div className="animate-rise lg:justify-self-end">
              <div className="overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
                <TravellersScene label="Four friends watching the sunset together" />
              </div>
              <p className="mt-5 text-center text-lg font-semibold text-ink-soft">
                {PRODUCT.closingLine}
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-faint">
              How it works
            </h2>
          </div>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="card card-interactive p-6">
                <div className="flex items-center gap-3">
                  <IconChip tone={step.tone}>
                    <step.icon className="h-4.5 w-4.5" aria-hidden />
                  </IconChip>
                  <span className="text-sm font-semibold text-ink-faint">Step {index + 1}</span>
                </div>
                <h3 className="mt-4 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="card overflow-hidden">
            <div className="grid gap-8 p-8 sm:p-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl">
                  It shows you the disagreement, not just the answer.
                </h2>
                <p className="mt-4 text-ink-soft">
                  If four people love an option and one person cannot make the dates, you will
                  see that on the card — with their name on it. A decision the group can
                  actually stand behind needs the trade-offs in the open.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/create">
                    Start with your group
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
              <ul className="space-y-3">
                {FIT_EXAMPLES.map((row) => (
                  <li
                    key={row.who}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-surface-muted/70 p-4"
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`}
                    />
                    <p className="text-sm">
                      <span className="font-semibold">{row.who}:</span>{" "}
                      <span className="text-ink-soft">{row.text}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
