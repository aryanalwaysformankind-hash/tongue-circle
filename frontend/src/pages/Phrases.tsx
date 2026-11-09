import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Link } from "react-router-dom";
import { BookmarkCheck, GraduationCap, List, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FlagPicker from "@/components/flags/FlagPicker";
import PhrasePractice from "@/components/phrases/PhrasePractice";
import { apiDelete, apiGet } from "@/lib/api";
import { languageInfo } from "@/lib/languages";
import type { Phrase } from "@/lib/types";

export default function Phrases() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [mode, setMode] = useState<"list" | "practice">("list");

  const phrasesQuery = useQuery({
    queryKey: ["phrases"],
    queryFn: async () => apiGet<Phrase[]>("/phrases", await getToken()),
  });

  const removePhrase = useMutation({
    mutationFn: async (id: string) => apiDelete<void>(`/phrases/${id}`, await getToken()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["phrases"] });
      toast.success("Phrase removed from your list");
    },
    onError: () => toast.error("That phrase couldn’t be removed. Please try again."),
  });

  const all = phrasesQuery.data ?? [];
  const languages = Array.from(new Set(all.map((item) => item.target_language))).sort();
  const needle = search.trim().toLowerCase();
  const phrases = all.filter(
    (item) =>
      (!language || item.target_language === language) &&
      (!needle || item.original.toLowerCase().includes(needle) || item.translated.toLowerCase().includes(needle)),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p data-testid="phrases-eyebrow" className="text-xs font-bold uppercase tracking-[0.18em] text-[#2A5B52]">
            Your study list
          </p>
          <h1 data-testid="phrases-page-title" className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Saved phrases
          </h1>
          <p data-testid="phrases-page-description" className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
            Real phrases from your conversations, kept so you can come back and learn them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p data-testid="phrases-count" className="text-sm font-semibold text-stone-500">
            {all.length} {all.length === 1 ? "phrase" : "phrases"} saved
          </p>
          {all.length > 0 && (
            <div className="flex rounded-full bg-stone-200/70 p-1" role="tablist" aria-label="Phrase view">
              {(["list", "practice"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  onClick={() => setMode(item)}
                  data-testid={`phrases-mode-${item}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${mode === item ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
                >
                  {item === "list" ? <List className="size-4" aria-hidden="true" /> : <GraduationCap className="size-4" aria-hidden="true" />}
                  {item === "list" ? "List" : "Practice"}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {mode === "practice" && all.length > 0 && <PhrasePractice key={all.length} phrases={all} />}

      {mode === "list" && all.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your phrases"
              aria-label="Search saved phrases"
              data-testid="phrases-search-input"
              className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm outline-none transition-shadow focus:border-[#D9532F] focus:ring-4 focus:ring-[#D9532F]/10"
            />
          </label>
          <FlagPicker
            options={languages.map((item) => ({ value: item, label: item, code: languageInfo(item)?.flag ?? "" }))}
            value={language}
            onChange={setLanguage}
            placeholder="All languages"
            searchPlaceholder="Filter by language"
            testId="phrases-language-filter"
            clearable
          />
        </div>
      )}

      {phrasesQuery.isError && (
        <p data-testid="phrases-load-error" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Your saved phrases couldn’t load right now. Please try again in a moment.
        </p>
      )}
      {phrasesQuery.isPending && <p data-testid="phrases-loading" className="text-sm text-stone-500">Loading your phrases…</p>}

      {phrasesQuery.isSuccess && all.length === 0 && (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-14 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#F4EBE2] text-[#B84728]">
            <BookmarkCheck className="size-6" aria-hidden="true" />
          </span>
          <h2 data-testid="phrases-empty-title" className="mt-4 font-heading text-xl font-bold">No phrases saved yet</h2>
          <p data-testid="phrases-empty-copy" className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            Translate a message in any chat, then tap “Save phrase” to add it to your study list.
          </p>
          <Link to="/messages" data-testid="phrases-empty-messages-link" className="mt-5 inline-block">
            <Button variant="outline" className="rounded-full">Go to messages</Button>
          </Link>
        </div>
      )}

      {mode === "list" && phrasesQuery.isSuccess && all.length > 0 && phrases.length === 0 && (
        <p data-testid="phrases-no-match" className="text-sm text-stone-500">No saved phrases match that search.</p>
      )}

      <div className={`space-y-3 ${mode === "list" ? "" : "hidden"}`}>
        {phrases.map((phrase) => (
          <article
            key={phrase.id}
            data-testid={`phrase-card-${phrase.id}`}
            className="group grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:grid-cols-[1fr_1fr_auto] sm:items-start"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Original</p>
              <p data-testid={`phrase-original-${phrase.id}`} className="mt-1 text-sm leading-6 text-stone-800">{phrase.original}</p>
            </div>
            <div className="border-l-2 border-amber-400/70 pl-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">{phrase.target_language}</p>
              <p data-testid={`phrase-translated-${phrase.id}`} className="mt-1 text-sm font-medium leading-6 text-[#1E1F24]">{phrase.translated}</p>
              <p data-testid={`phrase-meta-${phrase.id}`} className="mt-2 text-xs text-stone-500">
                {phrase.partner_name ? `From your chat with ${phrase.partner_name} · ` : ""}
                {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(phrase.created_at))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removePhrase.mutate(phrase.id)}
              disabled={removePhrase.isPending}
              data-testid={`phrase-remove-${phrase.id}`}
              className="inline-flex items-center gap-1.5 justify-self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 sm:justify-self-end"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
