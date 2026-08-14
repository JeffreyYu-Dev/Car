import {
  DELIVERY_CHANNEL_META,
  DELIVERY_CHANNEL_ORDER,
} from "@/frontend/diagnostics/delivery-channel";
import type { DiagnosisAction } from "@/frontend/diagnostics/types";
import { cn } from "@/frontend/lib/utils";

// A little "which screen did this go to" strip mimicking the vehicle's three
// delivery surfaces (companion app, center console, instrument cluster), so
// a demo can point at exactly where a response landed instead of just
// reading a severity word. The active surface lights up; the other two stay
// dim, standing in for the screens that *weren't* used this time.
function DeviceStrip({ active }: { active: DiagnosisAction["deliveryChannel"] }) {
  return (
    <div className="flex items-center gap-1.5">
      {DELIVERY_CHANNEL_ORDER.map((channel) => {
        const meta = DELIVERY_CHANNEL_META[channel];
        const Icon = meta.deviceIcon;
        const isActive = channel === active;
        return (
          <div
            key={channel}
            title={meta.device}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
              isActive
                ? meta.className
                : "border-border/50 text-muted-foreground/40",
            )}
          >
            <Icon className="size-3" />
            {isActive && <span>{meta.device}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function ActionMessage({ action }: { action: DiagnosisAction }) {
  const meta = DELIVERY_CHANNEL_META[action.deliveryChannel];
  const Icon = meta.actionIcon;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sent to {meta.device}
        </span>
        <DeviceStrip active={action.deliveryChannel} />
      </div>
      <div className={cn("flex items-start gap-2 rounded-md border p-3", meta.className)}>
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide">
            {meta.action} · {meta.description}
          </span>
          <p className="whitespace-pre-wrap text-sm text-foreground">{action.message}</p>
        </div>
      </div>
    </div>
  );
}
