import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Bookmark, BookmarkCheck, Languages, MessageCircle, Send, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import TranslateTargetPicker from "@/components/flags/TranslateTargetPicker";
import { apiGet, apiPost, apiPostStream } from "@/lib/api";
import { buildStarters } from "@/lib/starters";
import type { Conversation, DiscoverProfile, Message, Phrase, PhraseCreate, Profile, TypingStatus } from "@/lib/types";

const TYPING_PING_MS = 2_000;

export default function Messages() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedRecipient = searchParams.get("to");
  const [draft, setDraft] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [translationLanguages, setTranslationLanguages] = useState<Record<string, string>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const endOfMessages = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingPing = useRef(0);

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => apiGet<Conversation[]>("/conversations", await getToken()),
    refetchInterval: 10_000,
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => apiGet<Message[]>(`/conversations/${conversationId}/messages`, await getToken()),
    enabled: Boolean(conversationId),
    refetchInterval: 5_000,
  });
  const typingQuery = useQuery({
    queryKey: ["typing", conversationId],
    queryFn: async () => apiGet<TypingStatus>(`/conversations/${conversationId}/typing`, await getToken()),
    enabled: Boolean(conversationId),
    refetchInterval: 2_000,
  });
  const myProfileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => apiGet<Profile | null>("/profile/me", await getToken()),
  });

  // Loading a thread marks incoming messages read on the server; refresh the badges.
  useEffect(() => {
    if (!messagesQuery.dataUpdatedAt) return;
    void queryClient.invalidateQueries({ queryKey: ["unread"] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [messagesQuery.dataUpdatedAt, queryClient]);

  const savePhrase = useMutation({
    mutationFn: async ({ body }: { id: string; body: PhraseCreate }) =>
      apiPost<Phrase>("/phrases", body, await getToken()),
    onSuccess: async (_phrase, { id }) => {
      setSavedIds((current) => ({ ...current, [id]: true }));
      await queryClient.invalidateQueries({ queryKey: ["phrases"] });
      toast.success("Saved to your phrases");
    },
    onError: () => toast.error("That phrase couldn’t be saved. Please try again."),
  });

  const activeConversation = conversationsQuery.data?.find((item) => item.id === conversationId);
  const recipientId = activeConversation?.other_user_id ?? requestedRecipient ?? "";
  const partnerQuery = useQuery({
    queryKey: ["profile", recipientId],
    queryFn: async () => apiGet<DiscoverProfile>(`/profiles/${encodeURIComponent(recipientId)}`, await getToken()),
    enabled: Boolean(recipientId),
  });
  const recipientProfile = partnerQuery.data;
  const headerName = activeConversation?.other_display_name ?? recipientProfile?.display_name ?? "Choose a conversation";
  const messages = messagesQuery.data ?? [];
  const partnerTyping = Boolean(conversationId && typingQuery.data?.typing);
  const isNewChat = !messagesQuery.isPending || !conversationId ? messages.length === 0 : false;
  const starters = recipientProfile && isNewChat ? buildStarters(myProfileQuery.data, recipientProfile) : [];

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, conversationId, partnerTyping]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const now = Date.now();
    if (!conversationId || !value.trim() || now - lastTypingPing.current < TYPING_PING_MS) return;
    lastTypingPing.current = now;
    void (async () => {
      try {
        await apiPost<void>(`/conversations/${conversationId}/typing`, undefined, await getToken());
      } catch {
        // Typing hints are best-effort; never interrupt writing.
      }
    })();
  };

  useEffect(() => {
    if (conversationId || !requestedRecipient) return;
    const existing = conversationsQuery.data?.find((item) => item.other_user_id === requestedRecipient);
    if (existing) navigate(`/messages/${existing.id}`, { replace: true });
  }, [conversationId, requestedRecipient, conversationsQuery.data, navigate]);

  const sendMessage = useMutation({
    mutationFn: async (text: string) =>
      apiPost<Message>("/messages", { recipient_user_id: recipientId, text }, await getToken()),
    onSuccess: async (message) => {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["messages", message.conversation_id] });
      navigate(`/messages/${message.conversation_id}`);
    },
    onError: () => toast.error("Your message couldn’t be sent. Please try again."),
  });

  const translateMessage = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      let result = "";
      await apiPostStream(
        "/translate",
        { text, target_language: targetLanguage },
        await getToken(),
        (chunk) => {
          result += chunk;
          setTranslations((current) => ({ ...current, [id]: result }));
        },
      );
      return id;
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Translation is unavailable right now"),
  });

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (recipientId && draft.trim()) sendMessage.mutate(draft.trim());
  };

  return (
    <div className="space-y-7">
      <header>
        <p data-testid="messages-eyebrow" className="text-xs font-bold uppercase tracking-[0.18em] text-[#2A5B52]">
          Keep the conversation going
        </p>
        <h1 data-testid="messages-page-title" className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Your messages</h1>
        <p data-testid="messages-page-description" className="mt-2 text-sm text-stone-600">Say hello, practice naturally, and translate when a phrase gets tricky.</p>
      </header>

      {conversationsQuery.isError && (
        <p data-testid="messages-load-error" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Messages are unavailable right now. Your conversations are safe; please try again in a moment.
        </p>
      )}

      <section className="grid min-h-[560px] overflow-hidden rounded-[1.7rem] border border-stone-200 bg-white shadow-sm lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-stone-200 bg-[#FBFAF8] lg:border-b-0 lg:border-r">
          <div className="border-b border-stone-200 p-5">
            <h2 data-testid="messages-conversation-list-title" className="font-heading text-lg font-bold">Conversations</h2>
            <p data-testid="messages-conversation-count" className="mt-1 text-xs text-stone-500">
              {conversationsQuery.data?.length ?? 0} conversations
            </p>
          </div>
          {conversationsQuery.isPending && <p data-testid="messages-conversation-loading" className="p-5 text-sm text-stone-500">Loading conversations…</p>}
          {conversationsQuery.isSuccess && conversationsQuery.data.length === 0 && (
            <div className="p-5">
              <p data-testid="messages-empty-list-copy" className="text-sm leading-6 text-stone-600">Your first language exchange starts with a hello.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                data-testid="messages-discover-button"
                className="mt-4 rounded-full"
              >
                Discover learners
              </Button>
            </div>
          )}
          <div className="max-h-[390px] overflow-y-auto lg:max-h-[600px]">
            {(conversationsQuery.data ?? []).map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => navigate(`/messages/${conversation.id}`)}
                data-testid={`conversation-list-item-${conversation.id}`}
                className={`flex w-full items-center gap-3 border-b border-stone-100 px-4 py-4 text-left transition-colors hover:bg-[#F4EBE2]/60 ${conversation.id === conversationId ? "bg-[#F4EBE2]/70" : ""}`}
              >
                <img src={conversation.other_main_photo} alt={`${conversation.other_display_name}'s profile`} className="size-11 shrink-0 rounded-full object-cover" data-testid={`conversation-photo-${conversation.id}`} />
                <span className="min-w-0 flex-1">
                  <span data-testid={`conversation-name-${conversation.id}`} className={`block truncate text-sm text-stone-900 ${conversation.unread_count > 0 ? "font-extrabold" : "font-bold"}`}>{conversation.other_display_name}</span>
                  <span data-testid={`conversation-preview-${conversation.id}`} className={`mt-1 block truncate text-xs ${conversation.unread_count > 0 ? "font-semibold text-stone-800" : "text-stone-500"}`}>{conversation.last_message}</span>
                </span>
                {conversation.unread_count > 0 && (
                  <span
                    data-testid={`conversation-unread-badge-${conversation.id}`}
                    aria-label={`${conversation.unread_count} unread`}
                    className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#D9532F] px-1.5 text-[11px] font-bold text-white"
                  >
                    {conversation.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-h-[520px] min-w-0 flex-col">
          {(activeConversation || recipientProfile) ? (
            <>
              <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
                {activeConversation && (
                  <img src={activeConversation.other_main_photo} alt={`${headerName}'s profile`} className="size-10 rounded-full object-cover" data-testid="active-conversation-photo" />
                )}
                <div className="min-w-0 flex-1">
                  {recipientId ? (
                    <Link
                      to={`/people/${encodeURIComponent(recipientId)}`}
                      data-testid="active-conversation-name"
                      className="block truncate font-heading text-lg font-bold underline-offset-4 transition-colors hover:text-[#B84728] hover:underline"
                    >
                      {headerName}
                    </Link>
                  ) : (
                    <h2 data-testid="active-conversation-name" className="truncate font-heading text-lg font-bold">{headerName}</h2>
                  )}
                  <p data-testid="active-conversation-subtitle" className="text-xs text-stone-500">
                    {partnerTyping ? <span className="font-semibold text-[#2A5B52]">typing…</span> : "Language exchange · translation ready"}
                  </p>
                </div>
                <span className="hidden text-xs text-stone-500 sm:inline">Translate into</span>
                <TranslateTargetPicker
                  value={targetLanguage}
                  onChange={setTargetLanguage}
                  testId="message-translation-language"
                />
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[#FDFCFB] px-4 py-5 sm:px-6" aria-live="polite" aria-relevant="additions">
                {messagesQuery.isError && <p data-testid="messages-thread-error" className="text-center text-sm text-red-700">Could not load this conversation.</p>}
                {messagesQuery.isPending && conversationId && <p data-testid="messages-thread-loading" className="text-center text-sm text-stone-500">Loading messages…</p>}
                {isNewChat && (
                  <div className="mx-auto max-w-lg py-8 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#F4EBE2] text-[#B84728]">
                      <MessageCircle className="size-5" aria-hidden="true" />
                    </span>
                    <p data-testid="messages-first-message-title" className="mt-4 font-heading font-bold">Start with something small</p>
                    <p data-testid="messages-first-message-copy" className="mt-1 text-sm leading-6 text-stone-500">
                      Pick an opener below — it lands in your message box so you can tweak it before sending.
                    </p>
                    {starters.length > 0 && (
                      <ul className="mt-5 space-y-2 text-left" data-testid="conversation-starters">
                        {starters.map((starter, index) => (
                          <li key={starter} className="animate-rise" style={{ animationDelay: `${index * 60}ms` }}>
                            <button
                              type="button"
                              onClick={() => {
                                setDraft(starter);
                                composerRef.current?.focus();
                              }}
                              data-testid={`conversation-starter-${index}`}
                              className="group flex w-full items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm leading-6 text-stone-700 shadow-sm transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#D9532F]/50 hover:shadow-md"
                            >
                              <Sparkles className="mt-1 size-4 shrink-0 text-[#D9532F] transition-transform duration-200 group-hover:rotate-12" aria-hidden="true" />
                              <span>{starter}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {messages.map((message) => {
                  const mine = message.sender_user_id === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <article data-testid={`message-bubble-${message.id}`} className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[76%] ${mine ? "rounded-br-md bg-[#D9532F] text-white" : "rounded-bl-md bg-[#F0ECE6] text-[#1E1F24]"}`}>
                        <p data-testid={`message-text-${message.id}`} className="whitespace-pre-wrap break-words text-sm leading-6">
                          {translations[message.id] && !showOriginal[message.id] ? translations[message.id] : message.text}
                        </p>
                        <div className={`mt-2 flex items-center justify-between gap-3 ${mine ? "text-white/70" : "text-stone-500"}`}>
                          <time data-testid={`message-time-${message.id}`} className="text-[10px]" dateTime={message.created_at}>
                            {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}
                          </time>
                          {translations[message.id] ? (
                            <span className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setShowOriginal((current) => ({ ...current, [message.id]: !current[message.id] }))}
                                data-testid={`message-original-toggle-${message.id}`}
                                className="text-[11px] font-semibold underline-offset-2 hover:underline"
                              >
                                {showOriginal[message.id] ? "Show translation" : "Original"}
                              </button>
                              <button
                                type="button"
                                onClick={() => savePhrase.mutate({
                                  id: message.id,
                                  body: {
                                    original: message.text,
                                    translated: translations[message.id],
                                    target_language: translationLanguages[message.id] ?? targetLanguage,
                                    partner_name: headerName,
                                  },
                                })}
                                disabled={Boolean(savedIds[message.id]) || savePhrase.isPending || translateMessage.isPending}
                                data-testid={`message-save-phrase-${message.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline disabled:no-underline disabled:opacity-70"
                              >
                                {savedIds[message.id]
                                  ? <><BookmarkCheck className="size-3" aria-hidden="true" /> Saved</>
                                  : <><Bookmark className="size-3" aria-hidden="true" /> Save phrase</>}
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setTranslationLanguages((current) => ({ ...current, [message.id]: targetLanguage }));
                                translateMessage.mutate({ id: message.id, text: message.text });
                              }}
                              disabled={translateMessage.isPending}
                              data-testid={`message-translate-button-${message.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline disabled:opacity-50"
                            >
                              <Languages className="size-3" aria-hidden="true" />
                              Translate
                            </button>
                          )}
                        </div>
                      </article>
                    </div>
                  );
                })}
                {partnerTyping && (
                  <div className="flex justify-start" data-testid="typing-indicator">
                    <div className="animate-rise flex items-center gap-2 rounded-2xl rounded-bl-md bg-[#F0ECE6] px-4 py-3">
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="typing-dot size-1.5 rounded-full bg-stone-500" />
                        <span className="typing-dot size-1.5 rounded-full bg-stone-500 [animation-delay:150ms]" />
                        <span className="typing-dot size-1.5 rounded-full bg-stone-500 [animation-delay:300ms]" />
                      </span>
                      <span data-testid="typing-indicator-text" className="text-xs text-stone-500">
                        {headerName.split(" ")[0]} is typing…
                      </span>
                    </div>
                  </div>
                )}
                <div ref={endOfMessages} />
              </div>

              <form onSubmit={submitMessage} className="border-t border-stone-200 bg-white p-4 sm:p-5">
                <label className="sr-only" htmlFor="message-compose-input">Write a message</label>
                <div className="flex items-end gap-3">
                  <textarea
                    ref={composerRef}
                    id="message-compose-input"
                    rows={2}
                    maxLength={1200}
                    value={draft}
                    onChange={(event) => handleDraftChange(event.target.value)}
                    placeholder={`Say hello to ${headerName}…`}
                    data-testid="message-compose-input"
                    className="min-h-12 flex-1 resize-y rounded-2xl border border-stone-200 px-4 py-3 text-sm leading-5 outline-none transition-shadow placeholder:text-stone-400 focus:border-[#D9532F] focus:ring-4 focus:ring-[#D9532F]/10"
                  />
                  <Button
                    type="submit"
                    disabled={!draft.trim() || sendMessage.isPending}
                    data-testid="message-send-button"
                    className="h-12 rounded-2xl bg-[#D9532F] px-4 text-white hover:bg-[#BD421F]"
                  >
                    <Send className="mr-2 size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{sendMessage.isPending ? "Sending…" : "Send"}</span>
                  </Button>
                </div>
                <p data-testid="message-translation-note" className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-stone-500">
                  <Sparkles className="size-3" aria-hidden="true" /> Translate any message with one tap.
                </p>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-[#F4EBE2] text-[#B84728]">
                <MessageCircle className="size-6" aria-hidden="true" />
              </span>
              <h2 data-testid="messages-no-selection-title" className="mt-4 font-heading text-xl font-bold">Your next language exchange starts here</h2>
              <p data-testid="messages-no-selection-copy" className="mt-2 max-w-sm text-sm leading-6 text-stone-600">
                Choose a conversation on the left, or discover a learner and send the first hello.
              </p>
              <Button type="button" onClick={() => navigate("/")} data-testid="messages-no-selection-discover" className="mt-5 rounded-full bg-[#D9532F] text-white hover:bg-[#BD421F]">
                <MessageCircle className="mr-2 size-4" aria-hidden="true" /> Discover learners
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
