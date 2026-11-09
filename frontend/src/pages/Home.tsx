import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { Globe2, Languages, MessageCircle, Search, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiGet, apiPostStream } from "@/lib/api";
import FlagPicker from "@/components/flags/FlagPicker";
import { KnownLanguageChips, LanguageChip, LocationLine } from "@/components/flags/LanguageChips";
import TranslateTargetPicker from "@/components/flags/TranslateTargetPicker";
import PhotoLightbox from "@/components/profile/PhotoLightbox";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import type { DiscoverProfile, Profile } from "@/lib/types";

export default function Home() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [learningLanguage, setLearningLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [translatedBios, setTranslatedBios] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [lightboxProfile, setLightboxProfile] = useState<DiscoverProfile | null>(null);

  const myProfileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => apiGet<Profile | null>("/profile/me", await getToken()),
  });
  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => apiGet<DiscoverProfile[]>("/profiles", await getToken()),
  });

  const translation = useMutation({
    mutationFn: async ({ profileId, bio }: { profileId: string; bio: string }) => {
      let result = "";
      await apiPostStream(
        "/translate",
        { text: bio, target_language: targetLanguage },
        await getToken(),
        (chunk) => {
          result += chunk;
          setTranslatedBios((current) => ({ ...current, [profileId]: result }));
        },
      );
      return profileId;
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Translation is unavailable right now");
    },
  });

  const profiles = (profilesQuery.data ?? []).filter((profile) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      profile.display_name.toLowerCase().includes(needle) ||
      profile.city.toLowerCase().includes(needle) ||
      profile.country.toLowerCase().includes(needle) ||
      profile.learning_languages.some((language) => language.toLowerCase().includes(needle));
    const matchesLanguage =
      !learningLanguage ||
      profile.learning_languages.some((language) => language === learningLanguage);
    return matchesSearch && matchesLanguage;
  });

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#2A5B52] px-6 py-8 text-white shadow-[0_22px_60px_rgba(42,91,82,0.18)] sm:px-10 sm:py-10">
        <div className="absolute -right-10 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p data-testid="discover-eyebrow" className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">
              A world of voices
            </p>
            <h1 data-testid="discover-headline" className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Find your next language partner.
            </h1>
            <p data-testid="discover-description" className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Meet learners whose everyday language is your next big goal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span data-testid="discover-translation-badge" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white">
              <Sparkles className="size-4" aria-hidden="true" />
              Translate as you go
            </span>
            <span data-testid="discover-community-badge" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-white">
              <Languages className="size-4" aria-hidden="true" />
              Learn from people
            </span>
          </div>
        </div>
      </section>

      {!myProfileQuery.isError && !myProfileQuery.data && !myProfileQuery.isPending && (
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#E8E4DF] bg-white p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p data-testid="profile-setup-prompt-title" className="font-heading text-lg font-bold">Make your profile yours</p>
            <p data-testid="profile-setup-prompt-copy" className="mt-1 text-sm text-stone-600">
              Add a photo and the languages you’re learning to meet your first partner.
            </p>
          </div>
          <Link to="/profile" data-testid="profile-setup-link">
            <Button className="rounded-full bg-[#D9532F] text-white hover:bg-[#BD421F]">Set up my profile</Button>
          </Link>
        </section>
      )}

      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p data-testid="discover-section-kicker" className="text-xs font-bold uppercase tracking-[0.18em] text-[#2A5B52]">
            Thoughtful introductions
          </p>
          <h2 data-testid="discover-section-title" className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Learners to meet
          </h2>
          <p data-testid="discover-sort-hint" className="mt-1 text-sm text-stone-500">
            Best language matches first: people who speak what you’re learning, and learn what you speak.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(200px,1fr)_230px] md:w-auto md:min-w-[480px]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, place or language"
              aria-label="Search learners"
              data-testid="discover-search-input"
              className="h-12 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 text-sm outline-none transition-shadow placeholder:text-stone-400 focus:border-[#D9532F] focus:ring-4 focus:ring-[#D9532F]/10"
            />
          </label>
          <FlagPicker
            options={LANGUAGE_OPTIONS}
            value={learningLanguage}
            onChange={setLearningLanguage}
            placeholder="Any learning language"
            searchPlaceholder="Filter by language"
            testId="discover-language-filter"
            clearable
          />
        </div>
      </section>

      {profilesQuery.isError && (
        <p data-testid="discover-load-error" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          We couldn’t load the community right now. Your page is still here—please try again in a moment.
        </p>
      )}
      {profilesQuery.isPending && (
        <p data-testid="discover-loading-message" className="text-sm text-stone-500">Finding learners…</p>
      )}
      {profilesQuery.isSuccess && profiles.length === 0 && (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 px-6 py-14 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#F4EBE2] text-[#B84728]">
            <Globe2 className="size-6" aria-hidden="true" />
          </span>
          <h3 data-testid="discover-empty-title" className="mt-4 font-heading text-xl font-bold">
            {search || learningLanguage ? "No learners match that search yet" : "You’re early—in a good way"}
          </h3>
          <p data-testid="discover-empty-copy" className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
            {search || learningLanguage
              ? "Try another name, place or language. New learner profiles appear here as the community grows."
              : "As more learners join and create profiles, you’ll meet them here. Share your profile to start your first conversation."}
          </p>
          <Link to="/profile" data-testid="discover-empty-profile-link" className="mt-5 inline-block">
            <Button variant="outline" className="rounded-full">View my profile</Button>
          </Link>
        </div>
      )}

      {profiles.length > 0 && (
        <div data-testid="discover-profile-list" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <article
              key={profile.user_id}
              data-testid={`discover-profile-card-${profile.user_id}`}
              className="group overflow-hidden rounded-[1.6rem] border border-stone-200 bg-white shadow-[0_10px_30px_rgba(36,31,27,0.05)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(36,31,27,0.1)]"
            >
              <div className="relative aspect-[1.5/1] overflow-hidden bg-stone-100">
                <button
                  type="button"
                  onClick={() => setLightboxProfile(profile)}
                  data-testid={`discover-open-photos-${profile.user_id}`}
                  aria-label={`View ${profile.display_name}'s photos`}
                  className="block h-full w-full cursor-zoom-in"
                >
                  <img
                    src={profile.main_photo}
                    alt={`${profile.display_name}'s profile`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    data-testid={`discover-profile-photo-${profile.user_id}`}
                  />
                </button>
                {profile.match_score >= 3 && (
                  <span
                    data-testid={`discover-match-badge-${profile.user_id}`}
                    className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#2A5B52] shadow-sm backdrop-blur"
                  >
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {profile.match_score >= 5 ? "Perfect exchange" : "Great match"}
                  </span>
                )}
                {profile.gallery_photos.length > 0 && (
                  <span data-testid={`discover-photo-count-${profile.user_id}`} className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                    +{profile.gallery_photos.length} photos
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/people/${encodeURIComponent(profile.user_id)}`}
                      data-testid={`discover-profile-name-${profile.user_id}`}
                      className="block font-heading text-xl font-bold underline-offset-4 transition-colors hover:text-[#B84728] hover:underline"
                    >
                      {profile.display_name}
                    </Link>
                    <LocationLine
                      profile={profile}
                      testId={`discover-profile-location-${profile.user_id}`}
                      className="mt-1 flex text-sm text-stone-500"
                    />
                  </div>
                  <span className="rounded-full bg-[#F4EBE2] px-2.5 py-1 text-xs font-semibold text-[#8B482F]" data-testid={`discover-language-count-${profile.user_id}`}>
                    {profile.learning_languages.length} learning
                  </span>
                </div>
                {profile.match_reasons.length > 0 && (
                  <p data-testid={`discover-match-reasons-${profile.user_id}`} className="mt-3 text-xs font-medium text-[#2A5B52]">
                    Why you match: {profile.match_reasons.join(" · ")}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <KnownLanguageChips skills={profile.known_languages} idPrefix={`discover-${profile.user_id}`} />
                  {profile.learning_languages.map((language) => (
                    <LanguageChip
                      key={language}
                      language={language}
                      tone="learning"
                      label="learning"
                      testId={`discover-learning-language-${profile.user_id}-${language.toLowerCase()}`}
                    />
                  ))}
                </div>
                {profile.bio && (
                  <div className="mt-4 border-l-2 border-[#D9532F]/40 pl-3">
                    <p data-testid={`discover-profile-bio-${profile.user_id}`} className="line-clamp-3 text-sm leading-6 text-stone-600">
                      {translatedBios[profile.user_id] && !showOriginal[profile.user_id]
                        ? translatedBios[profile.user_id]
                        : profile.bio}
                    </p>
                    {translatedBios[profile.user_id] && (
                      <button
                        type="button"
                        onClick={() => setShowOriginal((current) => ({ ...current, [profile.user_id]: !current[profile.user_id] }))}
                        data-testid={`discover-bio-original-toggle-${profile.user_id}`}
                        className="mt-1 text-xs font-semibold text-[#B84728] hover:underline"
                      >
                        {showOriginal[profile.user_id] ? "Show translation" : "Show original"}
                      </button>
                    )}
                    {!translatedBios[profile.user_id] && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <TranslateTargetPicker
                          value={targetLanguage}
                          onChange={setTargetLanguage}
                          testId={`discover-bio-target-${profile.user_id}`}
                        />
                        <button
                          type="button"
                          onClick={() => translation.mutate({ profileId: profile.user_id, bio: profile.bio })}
                          disabled={translation.isPending}
                          data-testid={`discover-bio-translate-${profile.user_id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#B84728] transition-colors hover:bg-[#F4EBE2] disabled:opacity-50"
                        >
                          <Languages className="size-3.5" aria-hidden="true" />
                          {translation.isPending ? "Translating…" : `Translate to ${targetLanguage}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
                  <Link
                    to={`/people/${encodeURIComponent(profile.user_id)}`}
                    data-testid={`discover-view-profile-${profile.user_id}`}
                    className={`${buttonVariants({ variant: "outline" })} rounded-xl`}
                  >
                    <UserRound className="mr-1.5 size-4" aria-hidden="true" />
                    View profile
                  </Link>
                  <Button
                    type="button"
                    onClick={() => navigate(`/messages?to=${encodeURIComponent(profile.user_id)}`)}
                    data-testid={`discover-message-button-${profile.user_id}`}
                    className="rounded-xl bg-[#D9532F] text-white hover:bg-[#BD421F]"
                  >
                    <MessageCircle className="mr-2 size-4" aria-hidden="true" />
                    Say hello
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="sr-only" data-testid="discover-search-status" aria-live="polite">
        {profiles.length} learners shown
      </div>
      <PhotoLightbox
        open={Boolean(lightboxProfile)}
        onOpenChange={(open) => { if (!open) setLightboxProfile(null); }}
        name={lightboxProfile?.display_name ?? ""}
        photos={lightboxProfile ? [lightboxProfile.main_photo, ...lightboxProfile.gallery_photos] : []}
      />
    </div>
  );
}
