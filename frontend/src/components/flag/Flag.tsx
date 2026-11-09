import { useState } from "react";
import { Globe2 } from "lucide-react";
import { flagUrl } from "@/lib/languages";

interface FlagProps {
  code: string;
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  testId?: string;
}

const SIZES = {
  xs: "h-3 w-[18px] rounded-[3px]",
  sm: "h-3.5 w-5 rounded-[3px]",
  md: "h-5 w-7 rounded-[4px]",
  lg: "h-7 w-10 rounded-md",
};

export default function Flag({ code, label, size = "sm", className = "", testId }: FlagProps) {
  const [failed, setFailed] = useState(false);
  if (!code || failed) {
    return (
      <span
        data-testid={testId}
        aria-label={label}
        className={`inline-flex shrink-0 items-center justify-center bg-stone-200 text-stone-500 ${SIZES[size]} ${className}`}
      >
        <Globe2 className="size-[70%]" aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={flagUrl(code)}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
      data-testid={testId}
      className={`inline-block shrink-0 object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${SIZES[size]} ${className}`}
    />
  );
}
