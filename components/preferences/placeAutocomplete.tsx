"use client";

import * as React from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";

export interface PlaceValue {
  name: string;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Suggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string | null;
  description: string;
}

/**
 * Debounced so a paid autocomplete call is not made on every keystroke, and
 * resolved to coordinates only when a suggestion is actually chosen.
 */
export function PlaceAutocomplete({
  id,
  kind = "city",
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id: string;
  kind?: "city" | "destination";
  value: PlaceValue | null;
  onChange: (value: PlaceValue | null) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [query, setQuery] = React.useState(value?.name ?? "");
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(-1);

  // Adjusting state during render is the supported way to mirror a prop that
  // the parent can change underneath us (clearing or resolving the place).
  const [syncedName, setSyncedName] = React.useState(value?.name ?? "");
  if ((value?.name ?? "") !== syncedName) {
    setSyncedName(value?.name ?? "");
    setQuery(value?.name ?? "");
    setSuggestions([]);
  }

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || term === value?.name) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{ suggestions: Suggestion[] }>(
          `/api/places/search?q=${encodeURIComponent(term)}&kind=${kind}`,
        );
        if (!cancelled) {
          setSuggestions(data.suggestions);
          setOpen(data.suggestions.length > 0);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kind, value?.name]);

  async function choose(suggestion: Suggestion) {
    setOpen(false);
    setQuery(suggestion.primaryText);
    // Coordinates only matter once a place is picked, so details is called here
    // rather than for every suggestion shown.
    try {
      const data = await apiFetch<{
        place: { latitude: number; longitude: number; placeId: string; name: string };
      }>(`/api/places/details?placeId=${encodeURIComponent(suggestion.placeId)}`);
      onChange({
        name: suggestion.primaryText,
        placeId: data.place.placeId,
        latitude: data.place.latitude,
        longitude: data.place.longitude,
      });
    } catch {
      onChange({ name: suggestion.primaryText, placeId: null, latitude: null, longitude: null });
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <Input
          id={id}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-invalid={invalid ? true : undefined}
          className={cn("pl-9 pr-9", invalid && "border-notfit")}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length < 2) {
              setSuggestions([]);
              setOpen(false);
            }
            if (value) onChange(null);
          }}
          onFocus={() => setOpen(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter" && active >= 0) {
              event.preventDefault();
              void choose(suggestions[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {loading ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-faint"
            aria-hidden
          />
        ) : query ? (
          <button
            type="button"
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-faint hover:bg-surface-muted"
            onClick={() => {
              setQuery("");
              onChange(null);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-surface p-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={cn(
                  "w-full rounded-xl px-3 py-2 text-left text-sm",
                  index === active ? "bg-primary-soft" : "hover:bg-surface-muted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void choose(suggestion)}
              >
                <span className="block font-medium">{suggestion.primaryText}</span>
                {suggestion.secondaryText ? (
                  <span className="block text-xs text-ink-faint">{suggestion.secondaryText}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
