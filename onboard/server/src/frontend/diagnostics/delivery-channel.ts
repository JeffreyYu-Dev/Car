import { BellRing, Gauge, Monitor, Siren, Smartphone } from "lucide-react";
import type { DeliveryChannel } from "@/frontend/diagnostics/types";

// Maps the action module's delivery channel to the vehicle "screen" it would
// actually appear on in a real car, so the demo can point at a specific
// destination instead of just reading a severity label. Mirrors Fig. 2c of
// the paper (instrument cluster / center console / companion app), which the
// backend's three channels (dashboard_alert, dashboard_reminder, memo) map
// onto one-to-one.
export const DELIVERY_CHANNEL_META: Record<
  DeliveryChannel,
  {
    device: string;
    deviceIcon: typeof Gauge;
    action: string;
    actionIcon: typeof Siren;
    description: string;
    className: string;
  }
> = {
  dashboard_alert: {
    device: "Instrument cluster",
    deviceIcon: Gauge,
    action: "Urgent alert",
    actionIcon: Siren,
    description: "Pushed immediately with an audio alarm",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  dashboard_reminder: {
    device: "Center console",
    deviceIcon: Monitor,
    action: "Reminder",
    actionIcon: BellRing,
    description: "Shown on the console at an appropriate time",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  memo: {
    device: "Companion app",
    deviceIcon: Smartphone,
    action: "Advisory memo",
    actionIcon: Smartphone,
    description: "Waiting in the app for the driver to check",
    className: "border-border bg-muted text-muted-foreground",
  },
};

// Fixed left-to-right order matching the paper's severity gradient (low →
// high), used to render the "which screen did this go to" device strip.
export const DELIVERY_CHANNEL_ORDER: DeliveryChannel[] = [
  "memo",
  "dashboard_reminder",
  "dashboard_alert",
];
