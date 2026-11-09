# Tongue Circle — App Spec

Tongue Circle is a language-exchange community for meeting learners, sharing a
short profile, and practicing through direct messages with inline translation.

## Data model

- `profiles`: one record per Clerk `user_id`; display name, bio, one main photo,
  up to five additional photos (six total), city/country, one native and an
  optional fluent language, up to five learning languages, and UTC update time.
- `conversations`: stable conversation id, the two Clerk participant ids,
  latest message text, and UTC update time.
- `messages`: conversation id, sender/recipient Clerk ids, message text, and UTC
  creation time, and a `read` flag (set when the recipient opens the thread).
- `typing`: {conversation_id, user_id, at} — last keystroke ping; a partner is
  "typing" if their ping is < 5s old. Composer pings at most every 2s.
- Profiles also store `country_code` (ISO alpha-2, lowercase) for flags.
- `phrases`: per-user saved study phrases — original, translated text, target
  language, partner name, UTC creation time. Owner-scoped; user can delete.
- Exact geolocation coordinates are sent only after a user clicks auto-detect;
  reverse lookup returns approximate city/country and coordinates are discarded.

## Key flows

1. Signed-out visitors see the welcome screen and sign in with Google.
2. Signed-in members create a profile, add up to five photos, choose a location
   manually or use browser location, select known/learning languages, and save.
3. Members discover other profiles, filter by name/place/language, and start a
   conversation. Message history is stored and scoped to its participants.
4. Discovery is sorted by match score: +3 if their native language is one I'm
   learning, +2 if fluent, +2 if they learn a language I know; badges show
   "Great match" (>=3) / "Perfect exchange" (>=5) with reasons.
5. Tapping a profile photo opens a full-screen lightbox (arrows, keys, swipe).
6. Nav shows an unread badge (polls every 15s); conversation list shows
   per-thread unread counts; open threads poll every 5s.
7. After translating a chat message, "Save phrase" adds it to /phrases.
8. `/people/:userId` — full profile page: all photos (lightbox), bio with
   translation, native/fluent/learning languages with flags, Message button.
9. New chats show up to 4 conversation starters built client-side from both
   profiles (lib/starters.ts); tapping one fills the composer.
10. /phrases has List and Practice modes; Practice is a shuffled flip-card deck
    (original on front, translation on back) with Got it / Still learning.
11. Language and country choices use searchable flag pickers (flagcdn.com SVGs;
    language→flag map and ISO country list in lib/languages.ts).
12. Members request streamed translation of bios or messages into a selected
   language and can switch back to the original text.

## Authentication and access

- Authentication is Emergent-managed Clerk with Google sign-in only; sessions
  are verified by the FastAPI backend.
- Profile, discovery, location, conversation, message, and translation routes
  require a valid signed-in user. Users can update only their own profile and
  only read conversations they participate in.
- There are no app roles or seeded admin accounts.
