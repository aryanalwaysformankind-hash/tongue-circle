import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/react";
import { Camera, Check, LocateFixed, MapPin, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Flag from "@/components/flags/Flag";
import FlagPicker from "@/components/flags/FlagPicker";
import type { FlagOption } from "@/components/flags/FlagPicker";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { COUNTRIES, LANGUAGE_OPTIONS, countryCodeFor, languageInfo } from "@/lib/languages";
import type { LocationResolveRequest, LocationResolveResponse, Profile, ProfileUpsert } from "@/lib/types";

const languageOptions: FlagOption[] = LANGUAGE_OPTIONS;

const countryOptions: FlagOption[] = COUNTRIES.map((item) => ({
  value: item.code,
  label: item.name,
  code: item.code,
}));

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("This photo could not be opened"));
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileUpsert>({
    display_name: user?.fullName ?? "",
    bio: "",
    main_photo: "",
    gallery_photos: [],
    city: "",
    country: "",
    country_code: "",
    known_languages: [],
    learning_languages: [],
  });
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => apiGet<Profile | null>("/profile/me", await getToken()),
  });

  useEffect(() => {
    if (profileQuery.data) {
      const { user_id: _userId, updated_at: _updatedAt, ...profile } = profileQuery.data;
      setForm({ ...profile, country_code: countryCodeFor(profile.country, profile.country_code) });
    } else if (user?.fullName) {
      setForm((current) => ({ ...current, display_name: current.display_name || user.fullName || "" }));
    }
  }, [profileQuery.data, user?.fullName]);

  const saveProfile = useMutation({
    mutationFn: async (body: ProfileUpsert) => apiPut<Profile>("/profile/me", body, await getToken()),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      ]);
      toast.success("Your profile is saved");
    },
    onError: () => toast.error("Your profile couldn’t be saved. Please check the fields and try again."),
  });

  const resolveLocation = useMutation({
    mutationFn: async (coordinates: LocationResolveRequest) =>
      apiPost<LocationResolveResponse>("/location/resolve", coordinates, await getToken()),
    onSuccess: (location) => {
      setForm((current) => ({
        ...current,
        city: location.city,
        country: COUNTRIES.find((item) => item.code === location.country_code)?.name ?? location.country,
        country_code: location.country_code || countryCodeFor(location.country),
      }));
      setLocationStatus(`${location.city}, ${location.country} selected`);
    },
    onError: () => setLocationStatus("Could not detect a nearby city. You can enter it manually."),
  });

  const handlePhotoFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const currentCount = Number(Boolean(form.main_photo)) + form.gallery_photos.length;
    if (files.length + currentCount > 6) {
      toast.error("Your profile can have one main photo plus up to five more");
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      toast.error("Choose image files only");
      return;
    }
    if (files.some((file) => file.size > 1_000_000)) {
      toast.error("Each photo must be under 1 MB");
      return;
    }
    try {
      const photos = await Promise.all(files.map(readPhoto));
      setForm((current) => {
        if (!current.main_photo) {
          return { ...current, main_photo: photos[0], gallery_photos: [...photos.slice(1)] };
        }
        return { ...current, gallery_photos: [...current.gallery_photos, ...photos] };
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This photo could not be opened");
    }
  };

  const setKnownLanguage = (level: "native" | "fluent", language: string) => {
    setForm((current) => {
      const next = current.known_languages.filter((skill) => skill.level !== level && skill.language !== language);
      if (language) next.push({ language, level });
      return { ...current, known_languages: next };
    });
  };

  const removeLearningLanguage = (index: number) => {
    setForm((current) => ({
      ...current,
      learning_languages: current.learning_languages.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const setMainPhoto = (photoIndex: number) => {
    const photos = [form.main_photo, ...form.gallery_photos];
    const selected = photos[photoIndex];
    const remaining = photos.filter((_, index) => index !== photoIndex);
    setForm((current) => ({ ...current, main_photo: selected, gallery_photos: remaining }));
  };

  const removePhoto = (photoIndex: number) => {
    const photos = [form.main_photo, ...form.gallery_photos].filter(Boolean);
    photos.splice(photoIndex, 1);
    setForm((current) => ({
      ...current,
      main_photo: photos[0] ?? "",
      gallery_photos: photos.slice(1),
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Device location is unavailable. Enter your city and country below.");
      return;
    }
    setLocationBusy(true);
    setLocationStatus("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolveLocation.mutate(
          { latitude: coords.latitude, longitude: coords.longitude },
          { onSettled: () => setLocationBusy(false) },
        );
      },
      (error) => {
        setLocationBusy(false);
        setLocationStatus(error.code === error.PERMISSION_DENIED
          ? "Location permission was declined. Enter your city and country manually."
          : "Could not detect your location. Enter it manually instead.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  };

  const nativeLanguage = form.known_languages.find((skill) => skill.level === "native")?.language ?? "";
  const fluentLanguage = form.known_languages.find((skill) => skill.level === "fluent")?.language ?? "";
  const photos = [form.main_photo, ...form.gallery_photos].filter(Boolean);
  const canSave = Boolean(form.display_name.trim() && form.main_photo && nativeLanguage);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p data-testid="profile-page-eyebrow" className="text-xs font-bold uppercase tracking-[0.18em] text-[#2A5B52]">
          Your corner of the world
        </p>
        <h1 data-testid="profile-page-title" className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Your language profile
        </h1>
        <p data-testid="profile-page-description" className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Help conversation partners find a little common ground before they say hello.
        </p>
      </header>

      {profileQuery.isError && (
        <p data-testid="profile-load-error" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          We couldn’t load your saved details. You can still update and save your profile below.
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) saveProfile.mutate(form);
        }}
        className="space-y-6"
      >
        <section className="rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 data-testid="profile-photos-heading" className="font-heading text-xl font-bold">Photos</h2>
              <p data-testid="profile-photos-description" className="mt-1 text-sm text-stone-600">
                One main photo and up to five more. Your first photo becomes the main one.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-[#D9532F] hover:text-[#B84728]">
              <Camera className="size-4" aria-hidden="true" />
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => void handlePhotoFiles(event)}
                data-testid="profile-photo-upload-input"
                className="sr-only"
              />
            </label>
          </div>
          {photos.length === 0 ? (
            <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-[#FAF8F5] text-center">
              <Camera className="size-8 text-stone-400" aria-hidden="true" />
              <p data-testid="profile-photo-empty-title" className="mt-3 text-sm font-semibold text-stone-700">Add your main profile photo</p>
              <p data-testid="profile-photo-empty-copy" className="mt-1 text-xs text-stone-500">JPEG, PNG or another image format · under 1 MB each</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <figure key={`${photo.slice(0, 48)}-${index}`} className={`relative overflow-hidden rounded-2xl bg-stone-100 ${index === 0 ? "col-span-2 aspect-[1.7/1] sm:col-span-1 sm:aspect-[0.9/1]" : "aspect-[0.9/1]"}`}>
                  <img
                    src={photo}
                    alt={index === 0 ? "Main profile photo" : `Profile gallery photo ${index}`}
                    className="h-full w-full object-cover"
                    data-testid={index === 0 ? "profile-main-photo-preview" : `profile-gallery-photo-${index}`}
                  />
                  <figcaption data-testid={`profile-photo-caption-${index}`} className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                    {index === 0 ? "Main photo" : `Photo ${index + 1}`}
                  </figcaption>
                  <div className="absolute inset-x-2 bottom-2 flex gap-2">
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => setMainPhoto(index)}
                        data-testid={`profile-photo-make-main-${index}`}
                        className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-stone-800 shadow-sm transition-colors hover:bg-white"
                      >
                        Make main
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      data-testid={`profile-photo-remove-${index}`}
                      className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm transition-colors hover:bg-white"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </figure>
              ))}
            </div>
          )}
          <p data-testid="profile-photo-count" className="mt-3 text-xs text-stone-500">{photos.length} of 6 photos added (1 main + 5)</p>
        </section>

        <section className="rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 data-testid="profile-about-heading" className="font-heading text-xl font-bold">A little about you</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-stone-700">
              <span data-testid="profile-name-label">Name</span>
              <input
                required
                maxLength={60}
                value={form.display_name}
                onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                data-testid="profile-display-name-input"
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-normal outline-none transition-shadow focus:border-[#D9532F] focus:ring-4 focus:ring-[#D9532F]/10"
                placeholder="What should people call you?"
              />
            </label>
            <div className="space-y-2">
              <p data-testid="profile-location-label" className="text-sm font-semibold text-stone-700">Your location</p>
              <Button
                type="button"
                variant="outline"
                onClick={detectLocation}
                disabled={locationBusy}
                data-testid="profile-auto-location-button"
                className="w-full justify-start rounded-xl border-stone-200"
              >
                <LocateFixed className="mr-2 size-4 text-[#2A5B52]" aria-hidden="true" />
                {locationBusy ? "Finding your area…" : "Use my current location"}
              </Button>
              <p data-testid="profile-location-privacy-note" className="text-xs leading-5 text-stone-500">
                Your browser asks first. Exact coordinates are used only to find a nearby city, then discarded.
              </p>
              {locationStatus && <p role="status" aria-live="polite" data-testid="profile-location-status" className="text-xs font-medium text-[#2A5B52]">{locationStatus}</p>}
            </div>
            <label className="space-y-2 text-sm font-semibold text-stone-700">
              <span data-testid="profile-city-label">City</span>
              <input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                data-testid="profile-city-input"
                className="h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-normal outline-none transition-shadow focus:border-[#D9532F] focus:ring-4 focus:ring-[#D9532F]/10"
                placeholder="e.g. Lisbon"
              />
            </label>
            <div className="space-y-2">
              <p data-testid="profile-country-label" className="text-sm font-semibold text-stone-700">Country</p>
              <FlagPicker
                options={countryOptions}
                value={form.country_code}
                onChange={(code) => {
                  const country = COUNTRIES.find((item) => item.code === code);
                  setForm((current) => ({ ...current, country_code: code, country: country?.name ?? "" }));
                }}
                placeholder="Choose your country"
                searchPlaceholder="Search countries"
                testId="profile-country"
                clearable
              />
            </div>
            <label className="space-y-2 text-sm font-semibold text-stone-700 sm:col-span-2">
              <span data-testid="profile-bio-label">A few lines about you</span>
              <textarea
                maxLength={500}
                rows={4}
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                data-testid="profile-bio-input"
                className="w-full resize-y rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-normal leading-6 outline-none transition-shadow focus:border-[#D9532F] focus:ring-4 focus:ring-[#D9532F]/10"
                placeholder="Tell a new conversation partner what you’re curious about…"
              />
              <span data-testid="profile-bio-character-count" className="block text-right text-xs font-normal text-stone-500">{form.bio.length} / 500</span>
            </label>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 data-testid="profile-languages-heading" className="font-heading text-xl font-bold">Languages in your life</h2>
          <p data-testid="profile-languages-description" className="mt-1 text-sm text-stone-600">
            Choose one native language, one optional fluent language, and up to five you’re learning.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p data-testid="profile-native-language-label" className="text-sm font-semibold text-stone-700">Native language</p>
              <FlagPicker
                options={languageOptions.filter((option) => option.value !== fluentLanguage)}
                value={nativeLanguage}
                onChange={(language) => setKnownLanguage("native", language)}
                placeholder="Choose your native language"
                searchPlaceholder="Search languages"
                testId="profile-native-language"
              />
            </div>
            <div className="space-y-2">
              <p data-testid="profile-fluent-language-label" className="text-sm font-semibold text-stone-700">
                Fluent language <span className="font-normal text-stone-400">(optional)</span>
              </p>
              <FlagPicker
                options={languageOptions.filter((option) => option.value !== nativeLanguage)}
                value={fluentLanguage}
                onChange={(language) => setKnownLanguage("fluent", language)}
                placeholder="Add a fluent language"
                searchPlaceholder="Search languages"
                testId="profile-fluent-language"
                clearable
              />
            </div>
          </div>
          <div className="mt-7 border-t border-stone-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 data-testid="profile-learning-languages-title" className="text-sm font-bold">Languages you want to learn</h3>
                <p data-testid="profile-learning-languages-copy" className="mt-1 text-xs text-stone-500">
                  {form.learning_languages.length} of 5 chosen · you can change them anytime.
                </p>
              </div>
              {form.learning_languages.length < 5 && (
                <FlagPicker
                  options={languageOptions.filter((option) => !form.learning_languages.includes(option.value))}
                  value=""
                  onChange={(language) => {
                    if (language) setForm((current) => ({ ...current, learning_languages: [...current.learning_languages, language].slice(0, 5) }));
                  }}
                  placeholder=""
                  searchPlaceholder="Search languages to learn"
                  testId="profile-add-learning-language"
                  triggerClassName="inline-flex h-9 items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition-[border-color,color] hover:border-[#D9532F] hover:text-[#B84728] data-[popup-open]:border-[#D9532F]"
                  trigger={<><Plus className="size-4" aria-hidden="true" /> Add language</>}
                />
              )}
            </div>
            {form.learning_languages.length === 0 ? (
              <p data-testid="profile-learning-empty" className="mt-4 rounded-xl border border-dashed border-stone-300 bg-[#FAF8F5] px-4 py-5 text-center text-sm text-stone-500">
                Pick the languages you dream of speaking — partners who speak them will show up first.
              </p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {form.learning_languages.map((language, index) => {
                  const info = languageInfo(language);
                  return (
                    <li
                      key={language}
                      data-testid={`profile-learning-language-chip-${index}`}
                      className="animate-rise group inline-flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 py-1.5 pl-2 pr-1.5 text-sm"
                    >
                      <Flag code={info?.flag ?? ""} label={language} size="md" className="rounded-full! size-6! object-cover" />
                      <span className="font-semibold text-amber-900">{language}</span>
                      {info && info.native !== language && <span className="text-xs text-amber-700/70">{info.native}</span>}
                      <button
                        type="button"
                        onClick={() => removeLearningLanguage(index)}
                        data-testid={`profile-remove-learning-language-${index}`}
                        className="flex size-6 items-center justify-center rounded-full text-amber-800/60 transition-colors hover:bg-amber-200/70 hover:text-amber-900"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Remove {language}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <p data-testid="profile-save-hint" className="inline-flex items-center gap-2 text-xs text-stone-500">
            <MapPin className="size-3.5" aria-hidden="true" /> Your exact location is never shown or saved.
          </p>
          <Button
            type="submit"
            disabled={!canSave || saveProfile.isPending}
            data-testid="profile-save-button"
            className="rounded-full bg-[#D9532F] px-6 text-white hover:bg-[#BD421F]"
          >
            <Check className="mr-2 size-4" aria-hidden="true" />
            {saveProfile.isPending ? "Saving profile…" : "Save profile"}
          </Button>
        </div>
        {!canSave && (
          <p data-testid="profile-required-fields-note" className="text-right text-xs text-stone-500">
            Add your name, main photo and native language to save.
          </p>
        )}
      </form>
      {profileQuery.data && (
        <p data-testid="profile-saved-status" className="text-right text-xs text-stone-500">
          Saved profile · {profileQuery.data.updated_at ? "ready to meet learners" : ""}
        </p>
      )}
    </div>
  );
}
