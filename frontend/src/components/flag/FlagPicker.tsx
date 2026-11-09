import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Flag from "@/components/flags/Flag";

export interface FlagOption {
  value: string;
  label: string;
  code: string;
  hint?: string;
}

interface FlagPickerProps {
  options: FlagOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  testId: string;
  clearable?: boolean;
  /** Custom trigger content (e.g. an "Add language" button). Selection is still reported via onChange. */
  trigger?: ReactNode;
  triggerClassName?: string;
  disabled?: boolean;
}

export default function FlagPicker({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Search…",
  testId,
  clearable = false,
  trigger,
  triggerClassName,
  disabled = false,
}: FlagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        (option.hint ?? "").toLowerCase().includes(needle),
    );
  }, [options, query]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
        else setTimeout(() => inputRef.current?.focus(), 30);
      }}
    >
      <PopoverTrigger
        type="button"
        disabled={disabled}
        data-testid={`${testId}-trigger`}
        className={
          triggerClassName ??
          "group flex h-12 w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-3.5 text-left text-sm font-normal outline-none transition-[border-color,box-shadow] hover:border-stone-300 focus-visible:border-[#D9532F] focus-visible:ring-4 focus-visible:ring-[#D9532F]/10 data-[popup-open]:border-[#D9532F] data-[popup-open]:ring-4 data-[popup-open]:ring-[#D9532F]/10 disabled:opacity-50"
        }
      >
        {trigger ?? (
          <>
            {selected ? (
              <Flag code={selected.code} label={selected.label} size="md" />
            ) : (
              <span className="h-5 w-7 rounded-[4px] border border-dashed border-stone-300" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {selected ? (
                <span data-testid={`${testId}-value`} className="font-semibold text-stone-900">
                  {selected.label}
                  {selected.hint && <span className="ml-2 font-normal text-stone-400">{selected.hint}</span>}
                </span>
              ) : (
                <span className="text-stone-400">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="size-4 text-stone-400 transition-transform duration-200 group-data-[popup-open]:rotate-180" aria-hidden="true" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,320px)] gap-0 overflow-hidden rounded-2xl p-0 shadow-[0_20px_50px_rgba(36,31,27,0.16)]">
        <div className="relative border-b border-stone-100 p-2">
          <Search className="absolute left-4.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && filtered[0]) {
                event.preventDefault();
                choose(filtered[0].value);
              }
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            data-testid={`${testId}-search`}
            className="h-10 w-full rounded-lg bg-stone-50 pl-9 pr-3 text-sm outline-none placeholder:text-stone-400 focus:bg-stone-100"
          />
        </div>
        <ul role="listbox" className="max-h-72 overflow-y-auto p-1.5" data-testid={`${testId}-list`}>
          {clearable && value && (
            <li>
              <button
                type="button"
                onClick={() => choose("")}
                data-testid={`${testId}-clear`}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-stone-500 transition-colors hover:bg-stone-100"
              >
                <X className="size-4" aria-hidden="true" /> Clear selection
              </button>
            </li>
          )}
          {filtered.length === 0 && (
            <li data-testid={`${testId}-empty`} className="px-3 py-6 text-center text-sm text-stone-500">
              Nothing matches “{query}”
            </li>
          )}
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => choose(option.value)}
                data-testid={`${testId}-option-${option.value.toLowerCase().replaceAll(" ", "-")}`}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[#F4EBE2]/70 ${option.value === value ? "bg-[#F4EBE2]" : ""}`}
              >
                <Flag code={option.code} label="" size="md" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-stone-900">{option.label}</span>
                  {option.hint && <span className="ml-2 text-stone-400">{option.hint}</span>}
                </span>
                {option.value === value && <Check className="size-4 text-[#D9532F]" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
