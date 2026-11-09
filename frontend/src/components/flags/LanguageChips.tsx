import Flag from "@/components/flags/Flag";
import { countryCodeFor, languageInfo } from "@/lib/languages";
import type { LanguageSkill, Profile } from "@/lib/types";

const TONES = {
  native: "bg-sky-50 text-sky-900 ring-sky-200",
  fluent: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  learning: "bg-amber-50 text-amber-900 ring-amber-200",
};

interface LanguageChipProps {
  language: string;
  tone: keyof typeof TONES;
  label?: string;
  testId: string;
}

export function LanguageChip({ language, tone, label, testId }: LanguageChipProps) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-semibold ring-1 ${TONES[tone]}`}
    >
      <Flag code={languageInfo(language)?.flag ?? ""} label="" size="xs" className="size-4! rounded-full!" />
      {language}
      {label && <span className="font-normal opacity-70">· {label}</span>}
    </span>
  );
}

export function KnownLanguageChips({ skills, idPrefix }: { skills: LanguageSkill[]; idPrefix: string }) {
  return (
    <>
      {skills.map((skill) => (
        <LanguageChip
          key={`${skill.language}-${skill.level}`}
          language={skill.language}
          tone={skill.level}
          label={skill.level}
          testId={`${idPrefix}-known-language-${skill.level}`}
        />
      ))}
    </>
  );
}

export function LocationLine({ profile, testId, className = "" }: { profile: Profile; testId: string; className?: string }) {
  if (!profile.city && !profile.country) return null;
  const code = countryCodeFor(profile.country, profile.country_code);
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1.5 ${className}`}>
      <Flag code={code} label={profile.country || "Location"} size="sm" />
      {[profile.city, profile.country].filter(Boolean).join(", ")}
    </span>
  );
}
