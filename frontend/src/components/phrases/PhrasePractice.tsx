import { useState } from "react";
import { RotateCcw, Shuffle, ThumbsUp, Trophy, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Flag from "@/components/flags/Flag";
import { languageInfo } from "@/lib/languages";
import type { Phrase } from "@/lib/types";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function PhrasePractice({ phrases }: { phrases: Phrase[] }) {
  const [deck, setDeck] = useState<Phrase[]>(() => shuffle(phrases));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [again, setAgain] = useState<Phrase[]>([]);

  const restart = (cards: Phrase[]) => {
    setDeck(shuffle(cards));
    setPosition(0);
    setFlipped(false);
    setKnown(0);
    setAgain([]);
  };

  const answer = (gotIt: boolean) => {
    const card = deck[position];
    if (gotIt) setKnown((count) => count + 1);
    else setAgain((cards) => [...cards, card]);
    setFlipped(false);
    // Let the card flip back before the next phrase appears on its front.
    setTimeout(() => setPosition((current) => current + 1), 160);
  };

  if (position >= deck.length) {
    return (
      <div data-testid="practice-summary" className="animate-rise mx-auto max-w-lg rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Trophy className="size-6" aria-hidden="true" />
        </span>
        <h2 data-testid="practice-summary-title" className="mt-4 font-heading text-2xl font-bold">Round complete</h2>
        <p data-testid="practice-summary-score" className="mt-2 text-sm text-stone-600">
          You knew <strong className="text-stone-900">{known}</strong> of {deck.length}
          {again.length > 0 ? ` · ${again.length} to review` : " · every single one!"}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {again.length > 0 && (
            <Button type="button" onClick={() => restart(again)} data-testid="practice-review-missed" className="rounded-full bg-[#D9532F] text-white hover:bg-[#BD421F]">
              <Undo2 className="mr-2 size-4" aria-hidden="true" /> Review {again.length} missed
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => restart(phrases)} data-testid="practice-restart" className="rounded-full">
            <RotateCcw className="mr-2 size-4" aria-hidden="true" /> Practice all again
          </Button>
        </div>
      </div>
    );
  }

  const card = deck[position];
  const flag = languageInfo(card.target_language)?.flag ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p data-testid="practice-progress-label" className="text-sm font-semibold text-stone-600">
          Card {position + 1} of {deck.length}
        </p>
        <button
          type="button"
          onClick={() => restart(phrases)}
          data-testid="practice-shuffle"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
        >
          <Shuffle className="size-3.5" aria-hidden="true" /> Shuffle & restart
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          data-testid="practice-progress-bar"
          className="h-full rounded-full bg-[#D9532F] transition-[width] duration-300"
          style={{ width: `${(position / deck.length) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((current) => !current)}
        data-testid="practice-card"
        aria-label={flipped ? "Show original phrase" : "Reveal translation"}
        className="group block h-72 w-full perspective-distant sm:h-80"
      >
        <div
          className={`relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] transform-3d ${flipped ? "rotate-y-180" : ""}`}
        >
          <div className="absolute inset-0 flex flex-col rounded-[2rem] border border-stone-200 bg-white p-7 text-left shadow-[0_20px_50px_rgba(36,31,27,0.1)] backface-hidden">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Original</p>
            <p data-testid="practice-card-original" className="my-auto font-heading text-2xl font-bold leading-snug text-stone-900 sm:text-3xl">
              {card.original}
            </p>
            <p className="text-xs text-stone-500 transition-colors group-hover:text-[#B84728]">Tap to reveal the {card.target_language} translation</p>
          </div>
          <div className="absolute inset-0 flex rotate-y-180 flex-col rounded-[2rem] bg-[#2A5B52] p-7 text-left text-white shadow-[0_20px_50px_rgba(42,91,82,0.3)] backface-hidden">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
              <Flag code={flag} label="" size="xs" /> {card.target_language}
            </p>
            <p data-testid="practice-card-translation" className="my-auto font-heading text-2xl font-bold leading-snug sm:text-3xl">
              {card.translated}
            </p>
            {card.partner_name && <p className="text-xs text-white/65">From your chat with {card.partner_name}</p>}
          </div>
        </div>
      </button>

      <div className={`grid grid-cols-2 gap-3 transition-opacity duration-200 ${flipped ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!flipped}>
        <Button
          type="button"
          variant="outline"
          onClick={() => answer(false)}
          tabIndex={flipped ? 0 : -1}
          data-testid="practice-still-learning"
          className="h-12 rounded-2xl"
        >
          <Undo2 className="mr-2 size-4" aria-hidden="true" /> Still learning
        </Button>
        <Button
          type="button"
          onClick={() => answer(true)}
          tabIndex={flipped ? 0 : -1}
          data-testid="practice-got-it"
          className="h-12 rounded-2xl bg-[#D9532F] text-white hover:bg-[#BD421F]"
        >
          <ThumbsUp className="mr-2 size-4" aria-hidden="true" /> Got it
        </Button>
      </div>
    </div>
  );
}
