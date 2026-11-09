import { Link } from "react-router-dom";
import { ArrowRight, Globe2, Languages, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Flag from "@/components/flags/Flag";

const communityPhotos = [
  {
    src: "https://images.unsplash.com/photo-1547699326-3d895d9acd30?auto=format&fit=crop&w=720&q=85",
    alt: "Smiling Italian man in front of the Colosseum in Rome",
    flag: "it",
    greeting: "Ciao!",
    position: "object-center",
  },
  {
    src: "https://images.unsplash.com/photo-1624233599786-ee6045a0e703?auto=format&fit=crop&w=560&q=85",
    alt: "Smiling German woman in a knit cap",
    flag: "de",
    greeting: "Hallo!",
    position: "object-center",
  },
  {
    src: "https://images.unsplash.com/photo-1740029144380-2180cc1c4cc9?auto=format&fit=crop&crop=faces&w=1100&h=420&q=85",
    alt: "Smiling Japanese woman sitting in a bright cafe",
    flag: "jp",
    greeting: "Konnichiwa!",
    position: "object-center",
  },
];

function GreetingTag({ flag, greeting, testId }: { flag: string; greeting: string; testId: string }) {
  return (
    <span
      data-testid={testId}
      className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-2.5 text-xs font-bold text-stone-800 shadow-sm backdrop-blur"
    >
      <Flag code={flag} label="" size="xs" className="size-4! rounded-full!" />
      {greeting}
    </span>
  );
}

export default function Landing() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#FAF8F5] text-[#1E1F24]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" data-testid="landing-brand-link">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#D9532F] text-white">
            <Globe2 className="size-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">Tongue Circle</span>
        </Link>
        <Link to="/sign-in" data-testid="landing-sign-in-link">
          <Button variant="outline" className="rounded-full border-stone-300 bg-white px-5">
            Sign in
          </Button>
        </Link>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:pt-12">
        <div className="animate-rise max-w-2xl">
          <p
            data-testid="landing-eyebrow"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E8E4DF] bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2A5B52] shadow-sm"
          >
            <Languages className="size-4" aria-hidden="true" />
            Language exchange, made human
          </p>
          <h1
            data-testid="landing-headline"
            className="font-heading text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Your next conversation could open up the world.
          </h1>
          <p data-testid="landing-description" className="mt-6 max-w-xl text-lg leading-8 text-[#525760]">
            Meet people who speak the language you’re learning. Share a little of your world, and
            find a new voice to practice with.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to="/sign-in" data-testid="landing-google-signin-link">
              <Button className="h-12 rounded-full bg-[#D9532F] px-6 text-base font-semibold text-white hover:bg-[#BD421F]">
                Continue with Google
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Button>
            </Link>
            <span data-testid="landing-free-translation-note" className="text-sm text-stone-500">
              Free to join · Translate while you chat
            </span>
          </div>
          <div className="mt-12 flex items-center gap-4 border-t border-stone-200 pt-6">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#E0F2FE] text-[#0369A1]">
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <p data-testid="landing-community-note" className="max-w-sm text-sm leading-6 text-stone-600">
              A thoughtful community for learners, not another language app to swipe through.
            </p>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl lg:ml-auto lg:mr-0">
          <div className="absolute -right-6 -top-7 h-36 w-36 rounded-full bg-[#E6C8B6]/60 blur-3xl" />
          <div className="absolute -bottom-8 -left-7 h-40 w-40 rounded-full bg-[#B9D6C7]/50 blur-3xl" />
          <div className="relative grid grid-cols-[1.12fr_0.88fr] grid-rows-[180px_140px_120px] gap-3 sm:grid-rows-[230px_170px_145px]">
            <figure className="relative row-span-2 overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_24px_70px_rgba(73,57,45,0.18)]">
              <img
                src={communityPhotos[0].src}
                alt={communityPhotos[0].alt}
                className={`h-full w-full object-cover ${communityPhotos[0].position}`}
                data-testid="landing-community-photo-one"
              />
              <GreetingTag flag={communityPhotos[0].flag} greeting={communityPhotos[0].greeting} testId="landing-greeting-italian" />
            </figure>
            <figure className="relative overflow-hidden rounded-[1.6rem] border-4 border-white shadow-xl">
              <img
                src={communityPhotos[1].src}
                alt={communityPhotos[1].alt}
                className={`h-full w-full object-cover ${communityPhotos[1].position}`}
                data-testid="landing-community-photo-two"
              />
              <GreetingTag flag={communityPhotos[1].flag} greeting={communityPhotos[1].greeting} testId="landing-greeting-german" />
            </figure>
            <div className="flex flex-col justify-center rounded-[1.6rem] bg-[#2A5B52] p-5 text-white shadow-xl">
              <p data-testid="landing-community-card-label" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                Find your people
              </p>
              <p data-testid="landing-community-card-copy" className="mt-2 font-heading text-xl font-bold leading-tight">
                One good conversation at a time.
              </p>
            </div>
            <figure className="relative col-span-2 overflow-hidden rounded-[1.8rem] border-4 border-white shadow-xl">
              <img
                src={communityPhotos[2].src}
                alt={communityPhotos[2].alt}
                className={`h-full w-full object-cover ${communityPhotos[2].position}`}
                data-testid="landing-community-photo-three"
              />
              <GreetingTag flag={communityPhotos[2].flag} greeting={communityPhotos[2].greeting} testId="landing-greeting-japanese" />
            </figure>
          </div>
          <div className="absolute -left-3 top-[40%] flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-xl backdrop-blur sm:-left-12">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#F4EBE2] text-[#B84728]">
              <Languages className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p data-testid="landing-translation-card-title" className="text-sm font-bold">Meaning, not just words</p>
              <p data-testid="landing-translation-card-copy" className="text-xs text-stone-500">Translate messages instantly</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t border-stone-200/80 px-5 py-5 text-center text-xs text-stone-500 sm:px-8">
        <p data-testid="landing-footer-copy">Tongue Circle — connect across borders, one conversation at a time.</p>
      </footer>
    </main>
  );
}
