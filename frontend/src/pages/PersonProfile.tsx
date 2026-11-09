import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { ArrowLeft, Expand, Languages, MessageCircle, PencilLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import Flag from "@/components/flags/Flag";
import { LocationLine } from "@/components/flags/LanguageChips";
import TranslateTargetPicker from "@/components/flags/TranslateTargetPicker";
import PhotoLightbox from "@/components/profile/PhotoLightbox";
import { apiGet, apiPostStream } from "@/lib/api";
import { languageInfo } from "@/lib/languages";
import type { DiscoverProfile } from "@/lib/types";

function LanguageRow({ language, caption, tone, testId }: { language: string; caption: string; tone: string; testId: string }) {
  const info = languageInfo(language);
  return (
    <li data-testid={testId} className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3.5 py-3">
      <Flag code={info?.flag ?? ""} label="" size="lg" className="size-10! rounded-full!" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-stone-900">{language}</p>
        {info && info.native !== language && <p className="truncate text-xs text-stone-500">{info.native}</p>}
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone}`}>{caption}</span>
    </li>
  );
}

export default function PersonProfile() {
  const { userId = "" } = useParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [translatedBio, setTranslatedBio] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => apiGet<DiscoverProfile>(`/profiles/${encodeURIComponent(userId)}`, await getToken()),
    enabled: Boolean(userId),
  });

  const translation = useMutation({
    mutationFn: async (bio: string) => {
      let result = "";
      setShowOriginal(false);
      await apiPostStream("/translate", { text: bio, target_language: targetLanguage }, await getToken(), (chunk) => {
        result += chunk;
        setTranslatedBio(result);
      });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Translation is unavailable right now"),
  });

  if (profileQuery.isPending) {
    return <p data-testid="person-loading" className="py-16 text-center text-sm text-stone-500">Loading profile…</p>;
  }
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 data-testid="person-not-found-title" className="font-heading text-2xl font-bold">This profile isn’t available</h1>
        <p data-testid="person-not-found-copy" className="mt-2 text-sm text-stone-600">It may have been removed. Plenty of other learners are waiting to meet you.</p>
        <Link to="/" data-testid="person-not-found-back" className={`${buttonVariants()} mt-5 rounded-full bg-[#D9532F] text-white hover:bg-[#BD421F]`}>
          Back to Discover
        </Link>
      </div>
    );
  }

  const profile = profileQuery.data;
  const isMe = profile.user_id === user?.id;
  const photos = [profile.main_photo, ...profile.gallery_photos];
  const native = profile.known_languages.find((skill) => skill.level === "native");
  const fluent = profile.known_languages.find((skill) => skill.level === "fluent");

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        data-testid="person-back-button"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-stone-600 transition-colors hover:text-[#B84728]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-10">
        <section aria-label="Photos" className="space-y-3">
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            data-testid="person-main-photo-button"
            className="group relative block aspect-[4/3.4] w-full overflow-hidden rounded-[2rem] bg-stone-100 shadow-[0_24px_60px_rgba(36,31,27,0.14)]"
          >
            <img
              src={profile.main_photo}
              alt={`${profile.display_name}'s main photo`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              data-testid="person-main-photo"
            />
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white opacity-90 backdrop-blur transition-opacity group-hover:opacity-100">
              <Expand className="size-3.5" aria-hidden="true" /> View {photos.length > 1 ? `all ${photos.length} photos` : "photo"}
            </span>
          </button>
          {profile.gallery_photos.length > 0 && (
            <div className="grid grid-cols-5 gap-2.5">
              {profile.gallery_photos.map((photo, index) => (
                <button
                  key={`${photo.slice(0, 40)}-${index}`}
                  type="button"
                  onClick={() => setLightboxIndex(index + 1)}
                  data-testid={`person-gallery-photo-${index}`}
                  className="aspect-square overflow-hidden rounded-xl bg-stone-100 ring-offset-2 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:ring-2 hover:ring-[#D9532F]"
                >
                  <img src={photo} alt={`${profile.display_name} photo ${index + 2}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            {profile.match_score >= 3 && !isMe && (
              <span data-testid="person-match-badge" className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#E3EFEA] px-3 py-1.5 text-xs font-bold text-[#2A5B52]">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {profile.match_score >= 5 ? "Perfect exchange" : "Great match"}
              </span>
            )}
            <h1 data-testid="person-name" className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              {profile.display_name}
            </h1>
            <LocationLine profile={profile} testId="person-location" className="mt-3 flex text-base text-stone-600" />
            {!isMe && profile.match_reasons.length > 0 && (
              <p data-testid="person-match-reasons" className="mt-3 text-sm font-medium text-[#2A5B52]">
                Why you match: {profile.match_reasons.join(" · ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {isMe ? (
              <Link to="/profile" data-testid="person-edit-profile-link" className={`${buttonVariants({ variant: "outline" })} h-11 rounded-full px-5`}>
                <PencilLine className="mr-2 size-4" aria-hidden="true" /> Edit my profile
              </Link>
            ) : (
              <Button
                type="button"
                onClick={() => navigate(`/messages?to=${encodeURIComponent(profile.user_id)}`)}
                data-testid="person-message-button"
                className="h-11 rounded-full bg-[#D9532F] px-6 text-white hover:bg-[#BD421F]"
              >
                <MessageCircle className="mr-2 size-4" aria-hidden="true" /> Message {profile.display_name.split(" ")[0]}
              </Button>
            )}
          </div>
          {isMe && (
            <p data-testid="person-self-note" className="rounded-xl bg-[#F4EBE2]/70 px-4 py-3 text-sm text-[#8B482F]">
              This is how other learners see your profile.
            </p>
          )}

          <div className="rounded-[1.6rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 data-testid="person-about-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">About</h2>
            {profile.bio ? (
              <>
                <p data-testid="person-bio" className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-700">
                  {translatedBio && !showOriginal ? translatedBio : profile.bio}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                  <TranslateTargetPicker value={targetLanguage} onChange={setTargetLanguage} testId="person-bio-target" />
                  <button
                    type="button"
                    onClick={() => translation.mutate(profile.bio)}
                    disabled={translation.isPending}
                    data-testid="person-bio-translate"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#B84728] transition-colors hover:bg-[#F4EBE2] disabled:opacity-50"
                  >
                    <Languages className="size-3.5" aria-hidden="true" />
                    {translation.isPending ? "Translating…" : `Translate to ${targetLanguage}`}
                  </button>
                  {translatedBio && (
                    <button
                      type="button"
                      onClick={() => setShowOriginal((current) => !current)}
                      data-testid="person-bio-original-toggle"
                      className="text-xs font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                    >
                      {showOriginal ? "Show translation" : "Show original"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p data-testid="person-bio-empty" className="mt-3 text-sm text-stone-500">
                {profile.display_name.split(" ")[0]} hasn’t written an introduction yet.
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <h2 data-testid="person-speaks-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Speaks</h2>
              <ul className="space-y-2">
                {native && <LanguageRow language={native.language} caption="Native" tone="bg-sky-100 text-sky-800" testId="person-language-native" />}
                {fluent && <LanguageRow language={fluent.language} caption="Fluent" tone="bg-emerald-100 text-emerald-800" testId="person-language-fluent" />}
              </ul>
            </div>
            <div>
              <h2 data-testid="person-learning-heading" className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Learning</h2>
              {profile.learning_languages.length > 0 ? (
                <ul className="space-y-2">
                  {profile.learning_languages.map((language) => (
                    <LanguageRow
                      key={language}
                      language={language}
                      caption="Learning"
                      tone="bg-amber-100 text-amber-800"
                      testId={`person-language-learning-${language.toLowerCase()}`}
                    />
                  ))}
                </ul>
              ) : (
                <p data-testid="person-learning-empty" className="text-sm text-stone-500">No learning languages yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <PhotoLightbox
        open={lightboxIndex !== null}
        onOpenChange={(open) => { if (!open) setLightboxIndex(null); }}
        name={profile.display_name}
        photos={photos}
        startIndex={lightboxIndex ?? 0}
      />
    </div>
  );
}
