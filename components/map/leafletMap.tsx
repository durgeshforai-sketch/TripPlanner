"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Activity } from "@/types/activity";

export interface MapOrigin {
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Free, keyless map built on Leaflet and OpenStreetMap tiles.
 *
 * This is the default map: it needs no API key, no billing account and no
 * quota, and it shows the same real geography a paid provider would. Leaflet
 * and its stylesheet load on demand so pages without a map never pay for them.
 */
export function LeafletMap({
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
  const [ready, setReady] = React.useState(false);
  const activityKey = activities.map((activity) => activity.id).join("|");

  React.useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function render() {
      const leaflet = await import("leaflet");
      if (cancelled || !container.current) return;

      // Leaflet's CSS is injected once, on demand.
      const STYLE_ID = "leaflet-css";
      if (!document.getElementById(STYLE_ID)) {
        const link = document.createElement("link");
        link.id = STYLE_ID;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = leaflet
        .map(container.current, { scrollWheelZoom: false, attributionControl: true })
        .setView([destination.latitude, destination.longitude], activities.length > 0 ? 11 : 9);

      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);

      const pin = (color: string) =>
        leaflet.divIcon({
          className: "",
          html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

      const bounds = leaflet.latLngBounds([[destination.latitude, destination.longitude]]);

      leaflet
        .marker([destination.latitude, destination.longitude], { icon: pin("#e05a3c") })
        .addTo(map)
        .bindPopup(`<strong>${escapeHtml(destination.name)}</strong>`);

      for (const activity of activities) {
        leaflet
          .marker([activity.latitude, activity.longitude], { icon: pin("#5b4be8") })
          .addTo(map)
          .bindPopup(escapeHtml(activity.name));
        bounds.extend([activity.latitude, activity.longitude]);
      }

      if (activities.length > 0) map.fitBounds(bounds, { padding: [40, 40] });
      if (!cancelled) setReady(true);

      cleanup = () => map.remove();
    }

    render().catch((error: unknown) => {
      console.warn("[map] leaflet failed to load", error);
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activityKey stands in for the array
  }, [destination.latitude, destination.longitude, destination.name, activityKey]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border ${className}`}>
      {!ready ? <Skeleton className="absolute inset-0 z-0 rounded-none" /> : null}
      <div
        ref={container}
        className="h-full w-full"
        role="img"
        aria-label={`Map of ${destination.name}`}
      />
      {origins.length > 0 && ready ? (
        <p className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-full bg-surface/90 px-3 py-1.5 text-xs text-ink-soft backdrop-blur">
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
