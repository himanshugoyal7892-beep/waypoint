"use client";

import {
  DEFAULT_MAX_SHOWS,
  updateTourSchema,
  type Audience,
  type Frequency,
} from "@waypoint/shared";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Field, FormError, controlProps } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { apiFetch } from "@/lib/api-client";
import { pickError, useFormSubmit } from "./use-form-submit";

export interface TargetingValues {
  audience: Audience;
  audienceDays: string;
  audienceBefore: string;
  frequency: Frequency;
  maxShows: string;
  intervalDays: string;
  startsAt: string;
  endsAt: string;
}

const AUDIENCE_HELP: Record<Audience, string> = {
  ALL: "Every visitor who reaches the start page.",
  NEW_USERS: "Visitors seen for the first time in the last few days, e.g. a welcome tour.",
  DORMANT_USERS: "Visitors coming back after a break, e.g. “here’s what changed”.",
  EXISTING_USERS: "Visitors who were already using the site before a date, e.g. a new feature.",
};

const FREQUENCY_HELP: Record<Frequency, string> = {
  ONCE: "Shown once. Skipping or finishing ends it.",
  UNTIL_COMPLETED: "Shown again on later visits (once per visit) until finished, up to a limit.",
  INTERVAL: "Shown again after a gap of days, up to a limit, until finished.",
};

/** "Who sees it and when" rules for automatic tours. Saves only these fields. */
export function TourTargetingForm({
  tourId,
  initial,
  manual,
  identityConfigured,
  projectHref,
}: {
  tourId: string;
  initial: TargetingValues;
  manual: boolean;
  identityConfigured: boolean;
  projectHref: string;
}) {
  const router = useRouter();
  const [v, setV] = React.useState<TargetingValues>(initial);
  const [saved, setSaved] = React.useState(false);
  const { errors, formError, submitting, submit } = useFormSubmit(
    updateTourSchema,
    async (data) => {
      await apiFetch(`/api/admin/v1/tours/${tourId}`, { method: "PATCH", body: data });
      setSaved(true);
      router.refresh();
    },
  );
  const set =
    (k: keyof TargetingValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setSaved(false);
      setV((prev) => {
        const next = { ...prev, [k]: e.target.value };
        // Sensible starting numbers when a choice first needs one.
        if (k === "audience" && !next.audienceDays)
          next.audienceDays = next.audience === "DORMANT_USERS" ? "30" : "14";
        if (k === "frequency" && next.frequency !== "ONCE" && !next.maxShows)
          next.maxShows = String(DEFAULT_MAX_SHOWS);
        if (k === "frequency" && next.frequency === "INTERVAL" && !next.intervalDays)
          next.intervalDays = "30";
        return next;
      });
    };
  const err = (k: string) => pickError(errors, k);
  const needsDays = v.audience === "NEW_USERS" || v.audience === "DORMANT_USERS";

  return (
    <form
      noValidate
      className="space-y-5"
      aria-label="Who sees it and when"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({
          audience: v.audience,
          audienceDays: needsDays ? v.audienceDays : null,
          audienceBefore: v.audience === "EXISTING_USERS" ? v.audienceBefore : null,
          frequency: v.frequency,
          maxShows: v.frequency === "ONCE" ? null : v.maxShows,
          intervalDays: v.frequency === "INTERVAL" ? v.intervalDays : null,
          startsAt: v.startsAt,
          endsAt: v.endsAt,
        });
      }}
    >
      <FormError message={formError} />
      {saved && <Alert tone="info">Targeting saved. Published tours use it right away.</Alert>}
      {manual && (
        <Alert tone="info">
          This tour starts manually, so these rules don’t apply. It still runs from a link or a
          button on your site.
        </Alert>
      )}

      <fieldset className="space-y-4" disabled={manual}>
        <legend className="text-sm font-semibold">Who sees it</legend>
        <Field
          id="t-audience"
          label="Audience"
          hint={AUDIENCE_HELP[v.audience]}
          error={err("audience")}
        >
          <NativeSelect
            {...controlProps("t-audience", err("audience"), "hint")}
            value={v.audience}
            onChange={set("audience")}
          >
            <option value="ALL">Everyone</option>
            <option value="NEW_USERS">New visitors</option>
            <option value="DORMANT_USERS">Returning after a break</option>
            <option value="EXISTING_USERS">Existing visitors only (new feature)</option>
          </NativeSelect>
        </Field>
        {needsDays && (
          <Field
            id="t-days"
            label={
              v.audience === "NEW_USERS" ? "First seen within (days)" : "Away for at least (days)"
            }
            error={err("audienceDays")}
          >
            <Input
              {...controlProps("t-days", err("audienceDays"))}
              type="number"
              min={1}
              max={365}
              inputMode="numeric"
              value={v.audienceDays}
              onChange={set("audienceDays")}
              className="w-32"
            />
          </Field>
        )}
        {v.audience === "EXISTING_USERS" && (
          <Field
            id="t-before"
            label="Feature launch date"
            hint="Only visitors first seen before this date see the tour. New visitors don’t."
            error={err("audienceBefore")}
          >
            <Input
              {...controlProps("t-before", err("audienceBefore"), "hint")}
              type="date"
              value={v.audienceBefore}
              onChange={set("audienceBefore")}
              className="w-48"
            />
          </Field>
        )}
        {v.audience !== "ALL" && (
          <p className="text-xs text-muted-foreground">
            {identityConfigured ? (
              <>
                Logged-in users are recognised across devices. “First seen” counts from when{" "}
                Waypoint was installed, unless your site sends a sign-up date.
              </>
            ) : (
              <>
                Without user recognition, each browser counts as a separate visitor.{" "}
                <a className="text-primary underline" href={`${projectHref}#identity`}>
                  Set up “Recognise logged-in users”
                </a>{" "}
                for accurate results.
              </>
            )}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4" disabled={manual}>
        <legend className="text-sm font-semibold">How often</legend>
        <Field
          id="t-frequency"
          label="Show it"
          hint={FREQUENCY_HELP[v.frequency]}
          error={err("frequency")}
        >
          <NativeSelect
            {...controlProps("t-frequency", err("frequency"), "hint")}
            value={v.frequency}
            onChange={set("frequency")}
          >
            <option value="ONCE">Once</option>
            <option value="UNTIL_COMPLETED">Until finished</option>
            <option value="INTERVAL">Repeat every few days</option>
          </NativeSelect>
        </Field>
        {v.frequency !== "ONCE" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {v.frequency === "INTERVAL" && (
              <Field id="t-interval" label="Days between showings" error={err("intervalDays")}>
                <Input
                  {...controlProps("t-interval", err("intervalDays"))}
                  type="number"
                  min={1}
                  max={365}
                  inputMode="numeric"
                  value={v.intervalDays}
                  onChange={set("intervalDays")}
                />
              </Field>
            )}
            <Field id="t-max" label="At most (times)" error={err("maxShows")}>
              <Input
                {...controlProps("t-max", err("maxShows"))}
                type="number"
                min={1}
                max={20}
                inputMode="numeric"
                value={v.maxShows}
                onChange={set("maxShows")}
              />
            </Field>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4" disabled={manual}>
        <legend className="text-sm font-semibold">When</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="t-start" label="From" hint="Optional" error={err("startsAt")}>
            <Input
              {...controlProps("t-start", err("startsAt"), "hint")}
              type="date"
              value={v.startsAt}
              onChange={set("startsAt")}
            />
          </Field>
          <Field id="t-end" label="Until (inclusive)" hint="Optional" error={err("endsAt")}>
            <Input
              {...controlProps("t-end", err("endsAt"), "hint")}
              type="date"
              value={v.endsAt}
              onChange={set("endsAt")}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Dates are whole days in UTC.</p>
      </fieldset>

      <Button type="submit" disabled={submitting || manual}>
        {submitting && <Loader2 className="animate-spin" aria-hidden />}
        {submitting ? "Saving…" : "Save targeting"}
      </Button>
    </form>
  );
}
