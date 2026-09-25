"use client";

import * as React from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { LeafletMap } from "./leafletMap";
import type { Activity } from "@/types/activity";

export interface MapOrigin {
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Real Google Maps, or an honest empty state. There is deliberately no
 * CSS-drawn stand-in: a fake map would misrepresent where things actually are.
 *
 * The SDK is fetched on demand when this component mounts, so pages without a
 * map never load it.
 */
export function TripMap({
  destination,
  activities = [],
  origins = [],
  className = "h-80 sm:h-[26rem]",
}: {
  destination: { name: string; latitude: number; longitude: number };
  activities?: Activity[];
  origins?: MapOrigin[];
  className?: string;
}) {
  const container = React.useRef<HTMLDivElement>(null);
  // The key is build-time constant, so "no Google" is an initial state rather
  // than something we discover after mounting.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  const [state, setState] = React.useState<"loading" | "ready" | "unavailable" | "error">(
    apiKey ? "loading" : "unavailable",
  );

  // Props arrive as fresh arrays each render; key the effect on the contents.
  const activityKey = activities.map((activity) => activity.id).join("|");

  React.useEffect(() => {
    if (!apiKey) return;

    let cancelled = false;
    setOptions({ key: apiKey, v: "weekly" });

    async function render(): Promise<void> {
      const [{ Map, InfoWindow }, { AdvancedMarkerElement }] = await Promise.all([
        importLibrary("maps"),
        importLibrary("marker"),
      ]);
      if (cancelled || !container.current) return;

      const map = new Map(container.current, {
        center: { lat: destination.latitude, lng: destination.longitude },
        zoom: activities.length > 0 ? 11 : 9,
        mapId: "tripsync",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
      });

      const info = new InfoWindow();
      const bounds = new google.maps.LatLngBounds();
      const centre = { lat: destination.latitude, lng: destination.longitude };

      new AdvancedMarkerElement({ map, position: centre, title: destination.name });
      bounds.extend(centre);

      for (const activity of activities) {
        const position = { lat: activity.latitude, lng: activity.longitude };
        const marker = new AdvancedMarkerElement({ map, position, title: activity.name });
        bounds.extend(position);
        marker.addListener("click", () => {
          info.setContent(
            `<div style="font:500 13px system-ui;max-width:220px">${escapeHtml(activity.name)}</div>`,
          );
          info.open({ map, anchor: marker });
        });
      }

      if (activities.length > 0) map.fitBounds(bounds, 48);
      if (!cancelled) setState("ready");
    }

    render().catch((error: unknown) => {
      console.warn("[map] could not load Google Maps", error);
      if (!cancelled) setState("error");
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activityKey stands in for the activities array
  }, [apiKey, destination.latitude, destination.longitude, destination.name, activityKey]);

  // No Google key is the normal case, and OpenStreetMap is a real map rather
  // than an apology — so fall through to it instead of an empty state.
  if (state === "unavailable" || state === "error") {
    return (
      <LeafletMap
        destination={destination}
        activities={activities}
        origins={origins}
        className={className}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border ${className}`}>
      {state === "loading" ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
      <div ref={container} className="h-full w-full" aria-label={`Map of ${destination.name}`} />
      {origins.length > 0 && state === "ready" ? (
        <p className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-3 py-1.5 text-xs text-ink-soft backdrop-blur">
          Travelling from {origins.map((o) => o.city).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );
}
