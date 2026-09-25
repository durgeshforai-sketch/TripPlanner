import type { TransportMode } from "@/types/transport";
import type {
  BudgetFlexibility,
  DateRange,
  DesiredDestination,
  DestinationMode,
  StylePreference,
  TravelScope,
} from "@/types/preferences";

/** Working copy of a member's answers while the flow is in progress. */
export interface Draft {
  travelScope: TravelScope;
  destinationMode: DestinationMode;
  desiredDestinations: DesiredDestination[];
  originCity: string;
  originPlaceId: string | null;
  originLatitude: number | null;
  originLongitude: number | null;
  nearestAirport: string | null;
  comfortableBudget: number;
  maximumBudget: number;
  budgetFlexibility: BudgetFlexibility;
  preferredDates: DateRange[];
  possibleDates: DateRange[];
  unavailableDates: DateRange[];
  minDays: number;
  preferredDays: number;
  maxDays: number;
  tripStyles: StylePreference[];
  mustHaves: string[];
  dealBreakers: string[];
  transportModes: TransportMode[];
}

export type StepErrors = Partial<Record<keyof Draft | "general", string>>;
