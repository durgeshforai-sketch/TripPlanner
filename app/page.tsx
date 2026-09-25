import Link from "next/link";
import { ArrowRight, Camera, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/trip/brand";
import { Polaroid, PolaroidFrame } from "@/components/journal/polaroid";
import { GROUP, SCRAPBOOK, nudgeForToday } from "@/lib/group";

/** Varied, hand-placed angles; a uniform grid would look like a stock gallery. */
const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5, -3.5, 2];

const STEPS = [
  {
    title: "Everyone fills in their bit",
    body: "Budget, dates, the vibe, and the deal-breakers. About three minutes each, whenever suits.",
  },
  {
    title: "We find where we overlap",
    body: "Dates that work for all of us, a budget that does not break anyone, places that tick the most boxes.",
  },
  {
    title: "Three real options",
    body: "Each with cost, travel time from wherever we are, a rough plan — and a line for every one of us on how well it fits.",
  },
  {
    title: "We vote, then we go",
    body: "Most votes wins. A tie gets one runoff. After that, somebody books it.",
  },
];

export default function HomePage() {
  const nudge = nudgeForToday();
  const count = GROUP.members.length;
  const countWord = GROUP.countWord;

  return (
    <>
      <SiteHeader>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/create?mode=join">
              <KeyRound className="h-4 w-4" aria-hidden />I have a code
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/create">Plan the next one</Link>
          </Button>
        </nav>
      </SiteHeader>

      <main id="main" className="flex-1">
        {/* ------------------------------------------------ the letter */}
        <section className="surface-gradient overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24">
            <div className="animate-rise">
              <p className="font-hand text-2xl text-primary sm:text-3xl">Dear {GROUP.roll},</p>
              <h1 className="mt-3 text-[2.75rem] leading-[1.02] sm:text-7xl">
                It&rsquo;s been too long.
                <br />
                <span className="italic text-primary">Let&rsquo;s go somewhere.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                Everyone drops in their budget, their dates and what they are in the mood for.
                This finds the trip that works for all {countWord} of us — and says plainly who is
                compromising, so nobody gets quietly outvoted.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/create">
                    Start planning the next one
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/create?mode=join">I have an invite code</Link>
                </Button>
              </div>
              <p className="mt-8 inline-block -rotate-1 font-hand text-2xl text-ink-soft">
                &ldquo;{nudge}&rdquo;
                <svg
                  aria-hidden
                  viewBox="0 0 220 12"
                  className="mt-0.5 h-2.5 w-full text-primary/70"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8 C 40 2, 70 11, 110 6 S 180 2, 218 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:mr-0">
              <div className="absolute -left-6 top-10 hidden w-44 sm:block lg:-left-14">
                <Polaroid
                  photo={SCRAPBOOK[1]}
                  tilt={-9}
                  tape="none"
                  caption="last time"
                  sizes="176px"
                  delay={250}
                />
              </div>
              <div className="relative sm:ml-16">
                <Polaroid
                  photo={GROUP.cover}
                  tilt={2.5}
                  tape="corners"
                  priority
                  aspect="5/4"
                  sizes="(min-width: 1024px) 460px, 90vw"
                  caption={`the ${countWord} of us — next time, somewhere new`}
                />
                <span
                  className="stamp absolute -bottom-3 -left-3 bg-bg/90 text-accent sm:-left-8"
                  style={{ "--tilt": "-8deg" } as React.CSSProperties}
                >
                  Next trip · TBD
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ boarding pass */}
        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6" aria-label="The crew">
          <div className="card flex flex-col overflow-hidden sm:flex-row">
            <div className="flex-1 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
                  Boarding pass
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                  Group of {count}
                </p>
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-ink-faint">
                Passengers
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {GROUP.members.map((name) => (
                  <li key={name} className="font-serif text-3xl font-semibold sm:text-4xl">
                    {name}
                  </li>
                ))}
              </ul>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {[
                  ["From", "the group chat"],
                  ["To", "somewhere we all agree on"],
                  ["When", "the dates that work for everyone"],
                  ["Gate", "open"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
                      {label}
                    </dt>
                    <dd className="mt-1 font-hand text-2xl leading-tight text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex items-center gap-5 border-t border-dashed border-border-strong p-6 sm:w-60 sm:flex-col sm:items-start sm:justify-between sm:border-l sm:border-t-0 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
                  Seat
                </p>
                <p className="mt-1 font-hand text-2xl">window, obviously</p>
              </div>
              <div
                className="h-14 flex-1 rounded-sm sm:w-full sm:flex-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 4px, var(--ink) 4px 5px, transparent 5px 9px, var(--ink) 9px 12px, transparent 12px 14px)",
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ scrapbook */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-5xl">Why we keep doing this</h2>
            <p className="mt-2 font-hand text-2xl text-ink-faint">(a non-exhaustive list)</p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
            {SCRAPBOOK.map((photo, index) => (
              <Polaroid
                key={photo.src}
                photo={photo}
                tilt={TILTS[index % TILTS.length]}
                tape={index % 3 === 1 ? "none" : "top"}
                caption={photo.caption}
                interactive
                delay={index * 60}
                className={index % 2 === 1 ? "lg:mt-10" : undefined}
              />
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ notebook page */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="card ruled relative overflow-hidden px-6 py-10 sm:px-14 sm:py-14">
            <span
              aria-hidden
              className="absolute inset-y-0 left-4 w-px bg-primary/35 sm:left-9"
            />
            <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
              <div>
                <h2 className="text-3xl sm:text-4xl">
                  How we&rsquo;ll decide
                  <span className="block font-hand text-2xl font-medium text-ink-faint sm:text-3xl">
                    without four hundred messages
                  </span>
                </h2>
                <ol className="mt-8 space-y-7">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-5">
                      <span className="w-8 shrink-0 font-hand text-4xl leading-none text-primary">
                        {index + 1}.
                      </span>
                      <div>
                        <h3 className="font-sans text-lg font-semibold">{step.title}</h3>
                        <p className="mt-1 leading-relaxed text-ink-soft">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="self-end">
                <p className="rotate-2 font-hand text-2xl leading-snug text-accent">
                  If an option does not work for one of us, their name is right there on it.
                  Nobody gets steamrolled.
                </p>
              </aside>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ memory wall */}
        <section className="bg-bg-tint/60">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <div className="relative mx-auto h-[25rem] w-full max-w-md sm:h-[31rem]">
              <div className="absolute left-0 top-0 w-48 sm:w-60">
                <Polaroid
                  photo={SCRAPBOOK[4]}
                  tilt={-7}
                  tape="top"
                  caption="don't lose these"
                  sizes="240px"
                />
              </div>
              <div className="absolute right-0 top-8 w-44 sm:w-56">
                <Polaroid
                  photo={SCRAPBOOK[3]}
                  tilt={6}
                  tape="none"
                  caption="or this"
                  sizes="224px"
                />
              </div>
              <div className="absolute bottom-0 left-[28%] w-44 sm:w-52">
                <PolaroidFrame tilt={-2} tape="top" caption="your photo here">
                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 border-2 border-dashed border-border-strong text-ink-faint">
                    <Camera className="h-7 w-7" aria-hidden />
                  </div>
                </PolaroidFrame>
              </div>
            </div>
            <div>
              <h2 className="text-3xl sm:text-5xl">And bring the photos from last time.</h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">
                Every trip has a memory wall. Pin the photos from our last one so they are not stuck
                in one person&rsquo;s camera roll — and so we remember exactly why we are doing
                this again. Only the {countWord} of us can see them.
              </p>
              <Button asChild size="lg" variant="accent" className="mt-8">
                <Link href="/create">
                  Start a trip and pin some
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ sign-off */}
        <section className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
          <h2 className="text-4xl sm:text-6xl">
            So&hellip; <span className="italic text-primary">where to next?</span>
          </h2>
          <p className="mt-4 font-hand text-2xl text-ink-soft">
            Takes three minutes. The trip takes care of the rest.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/create">
              Plan the next one
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <p className="mx-auto mt-16 max-w-xl text-xs leading-relaxed text-ink-faint">
            Stand-in photos by {[GROUP.cover, ...SCRAPBOOK].map((p) => p.credit).join(", ")} —
            Unsplash contributors, via Wikimedia Commons (CC0).
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
