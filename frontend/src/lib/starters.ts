import { languageInfo } from "@/lib/languages";
import type { Profile } from "@/lib/types";

/**
 * Opening lines for a brand-new chat, built from what both people speak and learn.
 * Most relevant first; the greeting is in the partner's native language.
 */
export function buildStarters(me: Profile | null | undefined, partner: Profile): string[] {
  const first = partner.display_name.split(" ")[0] || partner.display_name;
  const partnerNative = partner.known_languages.find((skill) => skill.level === "native")?.language;
  const greeting = (partnerNative && languageInfo(partnerNative)?.greeting) || "Hi";
  const hello = `${greeting}, ${first}!`;

  const myLearning = me?.learning_languages ?? [];
  const myKnown = me?.known_languages.map((skill) => skill.language) ?? [];
  const myNative = me?.known_languages.find((skill) => skill.level === "native")?.language;

  const theySpeakWhatILearn = partner.known_languages.find((skill) => myLearning.includes(skill.language))?.language;
  const theyLearnWhatISpeak = partner.learning_languages.find((language) => myKnown.includes(language));
  const sharedGoal = partner.learning_languages.find((language) => myLearning.includes(language));

  const starters: string[] = [];
  if (theySpeakWhatILearn && theyLearnWhatISpeak) {
    starters.push(
      `${hello} Want to swap? I can help with your ${theyLearnWhatISpeak} and you could help with my ${theySpeakWhatILearn} — 10 minutes each?`,
    );
  }
  if (theySpeakWhatILearn) {
    starters.push(`${hello} I'm learning ${theySpeakWhatILearn}. What's one phrase every beginner should know?`);
  }
  if (theyLearnWhatISpeak && !theySpeakWhatILearn) {
    starters.push(
      `${hello} I saw you're learning ${theyLearnWhatISpeak}${myNative === theyLearnWhatISpeak ? ", my native language" : ""}. Happy to help you practice!`,
    );
  }
  if (sharedGoal) {
    starters.push(`${hello} We're both learning ${sharedGoal}! What's been the hardest part for you so far?`);
  }
  if (partner.city || partner.country) {
    starters.push(`${hello} What's everyday life like in ${partner.city || partner.country}? I've always been curious.`);
  }
  if (partner.learning_languages[0]) {
    starters.push(`${hello} What got you interested in learning ${partner.learning_languages[0]}?`);
  }
  starters.push(`${hello} How do you like to practice — texting, or would you rather talk about a topic each day?`);

  return Array.from(new Set(starters)).slice(0, 4);
}
