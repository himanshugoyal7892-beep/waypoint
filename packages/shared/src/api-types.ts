import type {
  BuilderMode,
  EventName,
  Frequency,
  IdentitySource,
  Placement,
  TriggerType,
} from "./enums";
import type { PublishIssue } from "./publish-rules";

/** Consistent error envelope returned by every API route. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[] | PublishIssue[];
  };
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "PUBLISH_VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "BUILDER_PASS_INVALID"
  | "INTERNAL_ERROR";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** Step as delivered to the SDK: only what the runtime needs. */
export interface PublicTourStep {
  id: string;
  stepOrder: number;
  title: string;
  description: string;
  cssSelector: string;
  pageUrl: string;
  placement: Placement;
  nextButtonLabel: string;
  backButtonLabel: string;
  allowSkip: boolean;
}

export interface PublicTour {
  id: string;
  version: number;
  name: string;
  triggerType: TriggerType;
  frequency: Frequency;
  startUrl: string;
  steps: PublicTourStep[];
}

/** Where the SDK reads the logged-in user's id, if the project configured it. */
export interface PublicIdentityConfig {
  source: Exclude<IdentitySource, "NONE">;
  key: string;
}

export interface PublicToursResponse {
  tours: PublicTour[];
  identity: PublicIdentityConfig | null;
}

export interface VisitResponse {
  /** Opaque hashed key; the SDK attaches it to analytics so the server can count showings. */
  visitorKey: string;
  /** Automatic tours this visitor may see in this visit (audience, timing and dates applied). */
  eligibleTourIds: string[];
}

export interface InstallInstructions {
  publicKey: string;
  sdkUrl: string;
  snippet: string;
  allowedOrigins: string[];
  cspDirectives: string[];
  builderQueryParam: string;
}

export interface BuilderPassResponse {
  id: string;
  mode: BuilderMode;
  launchUrl: string;
  expiresAt: string;
}

export interface BuilderRedeemResponse {
  accessToken: string;
  expiresAt: string;
  mode: BuilderMode;
  tourId: string | null;
  project: { id: string; name: string; publicKey: string };
}

/** A validated analytics event (output of analyticsEventSchema). */
export interface AnalyticsEventPayload {
  clientEventId: string;
  tourId: string;
  tourVersion: number;
  stepId?: string;
  stepOrder?: number;
  anonymousVisitorId: string;
  sessionId: string;
  eventName: EventName;
  /** Already sanitised to origin + pathname. */
  currentUrl: string;
  timestamp: number;
  errorCode?: string;
  visitorKey?: string;
}
