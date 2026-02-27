import { ConsumerControlEvent } from "../../api/devices.ts";
import { Selector, SelectorItem } from "./Selector.tsx";

export function ConsumerControlKeySelector({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: ConsumerControlEvent;
  onChange?: (value: ConsumerControlEvent) => void;
}) {
  return (
    <Selector
      className={className}
      items={Object.values(ConsumerControlEvent).map(
        (v): SelectorItem<ConsumerControlEvent> => ({
          label: getConsumerControlEventLabel(v),
          value: v,
        }),
      )}
      selected={{ label: getConsumerControlEventLabel(value), value }}
      onChange={onChange}
    />
  );
}

const getConsumerControlEventLabel = (event: ConsumerControlEvent): string => {
  switch (event) {
    case ConsumerControlEvent.RECORD:
      return "Record";
    case ConsumerControlEvent.FAST_FORWARD:
      return "Fast Forward";
    case ConsumerControlEvent.REWIND:
      return "Rewind";
    case ConsumerControlEvent.SCAN_NEXT_TRACK:
      return "Next Track";
    case ConsumerControlEvent.SCAN_PREVIOUS_TRACK:
      return "Previous Track";
    case ConsumerControlEvent.STOP:
      return "Stop";
    case ConsumerControlEvent.EJECT:
      return "Eject";
    case ConsumerControlEvent.PLAY_PAUSE:
      return "Play/Pause";
    case ConsumerControlEvent.MUTE:
      return "Mute";
    case ConsumerControlEvent.VOLUME_DECREMENT:
      return "Volume Down";
    case ConsumerControlEvent.VOLUME_INCREMENT:
      return "Volume Up";
  }
};
