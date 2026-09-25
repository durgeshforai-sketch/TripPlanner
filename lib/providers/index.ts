import "server-only";
import { demoModeRequested, serverEnv } from "@/lib/env";
import { GooglePlacesProvider } from "./googlePlaces";
import { GoogleRoutesProvider } from "./googleRoutes";
import { DuffelFlightProvider } from "./duffelFlights";
import { AmadeusFlightProvider } from "./amadeusFlights";
import { OsmPlaceProvider } from "./osm/places";
import { OsrmRouteProvider } from "./osm/routes";
import { OsmActivityProvider } from "./osm/activities";
import {
  DemoActivityProvider,
  DemoFlightProvider,
  DemoPlaceProvider,
  DemoRouteProvider,
} from "./demo";
import type { ActivityProvider, FlightProvider, PlaceProvider, RouteProvider } from "./types";

/**
 * How a given kind of data is being sourced right now.
 *
 * - `live`  — a commercial provider with a key (Google, Duffel)
 * - `open`  — a free, keyless community service returning real data (OSM)
 * - `demo`  — generated sample data, always labelled as such in the UI
 * - `estimated` — our own model, shown as an estimate
 */
export type Mode = "live" | "open" | "demo" | "estimated";

const hasGoogle = (): boolean => Boolean(serverEnv.googleMapsServerKey);
const hasFlights = (): boolean => Boolean(serverEnv.duffelToken || serverEnv.amadeusClientId);

export function placesMode(): Mode {
  if (demoModeRequested) return "demo";
  return hasGoogle() ? "live" : "open";
}

export function routesMode(): Mode {
  if (demoModeRequested) return "demo";
  return hasGoogle() ? "live" : "open";
}

export function activitiesMode(): Mode {
  return placesMode();
}

/**
 * There is no free source of live airfares. Without a commercial key we fall
 * back to a distance-based estimate rather than pretending otherwise.
 */
export function flightsMode(): Mode {
  if (demoModeRequested) return "demo";
  return hasFlights() ? "live" : "estimated";
}

export function getPlaceProvider(): PlaceProvider {
  const mode = placesMode();
  if (mode === "demo") return new DemoPlaceProvider();
  return mode === "live" ? new GooglePlacesProvider() : new OsmPlaceProvider();
}

export function getRouteProvider(): RouteProvider {
  const mode = routesMode();
  if (mode === "demo") return new DemoRouteProvider();
  return mode === "live" ? new GoogleRoutesProvider() : new OsrmRouteProvider();
}

export function getActivityProvider(): ActivityProvider {
  const mode = activitiesMode();
  if (mode === "demo") return new DemoActivityProvider();
  return mode === "live" ? new GooglePlacesProvider() : new OsmActivityProvider();
}

/** Used only when a real flight provider is configured. */
export function getFlightProvider(): FlightProvider {
  if (flightsMode() !== "live") return new DemoFlightProvider();
  if (serverEnv.duffelToken) return new DuffelFlightProvider();
  return new AmadeusFlightProvider();
}

export interface DataSourceStatus {
  places: Mode;
  routes: Mode;
  flights: Mode;
  activities: Mode;
  ai: Mode;
  /** True when anything on screen is generated rather than sourced. */
  anyDemo: boolean;
  /** True when any figure is our own model rather than a provider's. */
  anyEstimated: boolean;
}

export function dataSourceStatus(): DataSourceStatus {
  const status = {
    places: placesMode(),
    routes: routesMode(),
    flights: flightsMode(),
    activities: activitiesMode(),
    ai: demoModeRequested ? "demo" : serverEnv.anthropicKey ? "live" : "estimated",
  } as const;

  const values = Object.values(status);
  return {
    ...status,
    anyDemo: values.includes("demo"),
    anyEstimated: values.includes("estimated"),
  };
}
