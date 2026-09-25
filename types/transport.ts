export const TRANSPORT_MODES = ["fly", "train", "bus", "drive"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  fly: "Flight",
  train: "Train",
  bus: "Bus",
  drive: "Self-drive",
};

export interface TransportOption {
  mode: TransportMode;
  /** One-way door-to-door hours, including getting to and from the terminal. */
  durationHours: number;
  distanceKm: number | null;
  /** Return cost per person, in INR. */
  costPerPerson: number;
  /** Whether the cost came from a provider or our own planning model. */
  costBasis: "live" | "estimated";
  /** Journeys long enough to be spent overnight. */
  overnight: boolean;
  note: string | null;
  /** False when the mode is possible but a poor idea for this distance. */
  sensible: boolean;
}

export interface OriginTransport {
  originCity: string;
  memberIds: string[];
  /** Road distance where a road route exists, else great-circle distance. */
  distanceKm: number | null;
  roadDistanceKm: number | null;
  options: TransportOption[];
  /** The mode we would suggest, given distance and cost. */
  recommended: TransportMode | null;
  /** True when the trip is short enough that road travel is the sane choice. */
  roadFirst: boolean;
}

export interface TransportSummary {
  perOrigin: OriginTransport[];
  minCostPerPerson: number | null;
  maxCostPerPerson: number | null;
  averageCostPerPerson: number | null;
  /** True when at least one origin is better off travelling by road. */
  anyRoadFirst: boolean;
  checkedAt: string;
}
