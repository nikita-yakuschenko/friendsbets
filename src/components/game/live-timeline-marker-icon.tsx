import {
  IconFlag,
  IconPlayFootball,
  IconPlayerPause,
} from "@tabler/icons-react";
import type { TimelineMarkerKind } from "@/lib/football-api/championat/build-live-timeline";
import { cn } from "@/lib/utils";

const ICON_SIZE = 24;

export function LiveTimelineMarkerIcon({
  marker,
}: {
  marker: TimelineMarkerKind;
}) {
  switch (marker) {
    case "start":
      return (
        <IconPlayFootball
          size={ICON_SIZE}
          stroke={1.75}
          className="shrink-0 text-brand-lime"
          aria-hidden
        />
      );
    case "halftime":
      return (
        <IconPlayerPause
          size={ICON_SIZE}
          stroke={1.75}
          className={cn("shrink-0 text-brand-muted live-pulse-icon")}
          aria-hidden
        />
      );
    case "end":
      return (
        <IconFlag
          size={ICON_SIZE}
          stroke={1.75}
          className="shrink-0 text-brand-muted"
          aria-hidden
        />
      );
  }
}
