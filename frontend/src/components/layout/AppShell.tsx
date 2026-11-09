import { ChevronDown } from "lucide-react";
import Flag from "@/components/flags/Flag";
import FlagPicker from "@/components/flags/FlagPicker";
import { LANGUAGE_OPTIONS, languageInfo } from "@/lib/languages";

interface TranslateTargetPickerProps {
  value: string;
  onChange: (language: string) => void;
  testId: string;
}

/** Compact "translate into" chooser shown next to translate actions. */
export default function TranslateTargetPicker({ value, onChange, testId }: TranslateTargetPickerProps) {
  return (
    <FlagPicker
      options={LANGUAGE_OPTIONS}
      value={value}
      onChange={(language) => { if (language) onChange(language); }}
      placeholder="Language"
      searchPlaceholder="Translate into…"
      testId={testId}
      triggerClassName="group inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white pl-1.5 pr-2 text-xs font-semibold text-stone-700 transition-[border-color] hover:border-stone-300 data-[popup-open]:border-[#D9532F]"
      trigger={
        <>
          <Flag code={languageInfo(value)?.flag ?? ""} label="" size="xs" className="size-4! rounded-full!" />
          <span data-testid={`${testId}-value`}>{value}</span>
          <ChevronDown className="size-3.5 text-stone-400 transition-transform duration-200 group-data-[popup-open]:rotate-180" aria-hidden="true" />
        </>
      }
    />
  );
}
