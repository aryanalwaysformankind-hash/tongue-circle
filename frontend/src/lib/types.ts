export interface ClerkConfig {
  enabled: boolean;
  publishable_key: string;
  proxy_url: string;
}

export interface LanguageSkill {
  language: string;
  level: "native" | "fluent";
}

export interface ProfileUpsert {
  display_name: string;
  bio: string;
  main_photo: string;
  gallery_photos: string[];
  city: string;
  country: string;
  country_code: string;
  known_languages: LanguageSkill[];
  learning_languages: string[];
}

export interface Profile extends ProfileUpsert {
  user_id: string;
  updated_at: string;
}

export interface DiscoverProfile extends Profile {
  match_score: number;
  match_reasons: string[];
}

export interface UnreadCount {
  count: number;
}

export interface PhraseCreate {
  original: string;
  translated: string;
  target_language: string;
  partner_name: string;
}

export interface Phrase extends PhraseCreate {
  id: string;
  created_at: string;
}

export interface LocationResolveRequest {
  latitude: number;
  longitude: number;
}

export interface LocationResolveResponse {
  city: string;
  country: string;
  country_code: string;
}

export interface TypingStatus {
  typing: boolean;
}

export interface MessageCreate {
  recipient_user_id: string;
  text: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  text: string;
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  other_user_id: string;
  other_display_name: string;
  other_main_photo: string;
  last_message: string;
  updated_at: string;
  unread_count: number;
}

export interface TranslateRequest {
  text: string;
  target_language: string;
}
