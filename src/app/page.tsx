"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import ChatMessage from "@/components/ChatMessage";
import ChatSidebar from "@/components/ChatSidebar";

import {
  getConversations,
  saveConversations,
  generateTitle,
} from "../lib/chat-storage";

import type { Conversation } from "@/types/chat";

const SUGGESTIONS = [
  "Explain a concept in simple terms",
  "Help me draft a professional email",
  "Debug a piece of code",
  "Brainstorm ideas for a project",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, setMessages, status, error, regenerate, stop } =
    useChat({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
    });

  const isLoading = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && !isLoading;

  // Load saved conversations on initial render
  useEffect(() => {
    const saved = (getConversations() ?? []).map((conversation) => ({
      ...conversation,
      messages: Array.isArray(conversation.messages)
        ? conversation.messages
        : [],
    }));

    setConversations(saved);

    if (saved.length > 0) {
      const latest = saved[0];

      setActiveId(latest.id);
      setMessages(latest.messages);
    }

    setHydrated(true);
  }, [setMessages]);

  // Update the active conversation whenever messages change
  useEffect(() => {
    if (!hydrated || !activeId || messages.length === 0) {
      return;
    }

    setConversations((previous) => {
      const existing = previous.find(
        (conversation) => conversation.id === activeId
      );

      if (!existing) return previous;

      const firstUserMessage = messages.find(
        (message) => message.role === "user"
      );

      const firstText = firstUserMessage?.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ");

      const updated: Conversation = {
        ...existing,
        title: firstText ? generateTitle(firstText) : existing.title,
        messages,
        updatedAt: Date.now(),
      };

      return previous
        .map((conversation) =>
          conversation.id === activeId ? updated : conversation
        )
        .sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, [messages, activeId, hydrated]);

  // Persist conversations whenever the list changes
  useEffect(() => {
    if (!hydrated) return;

    saveConversations(conversations);
  }, [conversations, hydrated]);

  // Scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  // Auto-grow the textarea up to a max height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Send a message
  const submit = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();

      if (!text || isLoading) return;

      setInput("");

      let conversationId = activeId;

      // Create a new conversation if none is selected
      if (!conversationId) {
        conversationId = crypto.randomUUID();

        const newConversation: Conversation = {
          id: conversationId,
          title: generateTitle(text),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setConversations((previous) => [newConversation, ...previous]);

        setActiveId(conversationId);
      }

      try {
        await sendMessage({ text });
      } catch (err) {
        console.error("Message sending failed:", err);
      }
    },
    [isLoading, activeId, sendMessage]
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(input);
    }
  }

  // Start a new conversation
  function handleNewChat() {
    if (isLoading) return;

    setActiveId(null);
    setMessages([]);
    setInput("");
    setDrawerOpen(false);
  }

  // Select an existing conversation
  function handleSelectConversation(id: string) {
    if (isLoading) return;

    const selected = conversations.find(
      (conversation) => conversation.id === id
    );

    if (!selected) return;

    setActiveId(selected.id);
    setMessages(selected.messages ?? []);
    setInput("");
    setDrawerOpen(false);
  }

  // Delete a conversation
  function handleDeleteConversation(id: string) {
    if (isLoading) return;

    const remaining = conversations.filter(
      (conversation) => conversation.id !== id
    );

    setConversations(remaining);

    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
      setInput("");
    }
  }

  const sidebar = (
    <ChatSidebar
      conversations={conversations}
      activeId={activeId}
      onSelect={handleSelectConversation}
      onNewChat={handleNewChat}
      onDelete={handleDeleteConversation}
    />
  );

  return (
    <main className="flex h-dvh bg-[#F3F6F5] text-[#0F1B2D]">
      {/* Sidebar (desktop) */}
      <div className="hidden h-full md:block">{sidebar}</div>

      {/* Sidebar (mobile drawer) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-[#0F1B2D]/50"
          />
          <div className="relative h-full w-72 max-w-[85%]">{sidebar}</div>
        </div>
      )}

      {/* Chat section */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-[#DCE4E1] bg-[#F3F6F5]/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open conversations"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE4E1] bg-white text-[#2B3A4A] transition hover:bg-[#E8F3F0] md:hidden"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="h-5 w-5"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              <div className="leading-tight">
                <h1 className="text-[15px] font-semibold">Chat Assistant</h1>
                <p className="flex items-center gap-1.5 text-xs text-[#5B6B66]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Powered by Tunenj
                </p>
              </div>
            </div>

            <button
              onClick={handleNewChat}
              disabled={isLoading}
              className="rounded-lg border border-[#DCE4E1] bg-white px-3 py-2 text-sm font-medium text-[#2B3A4A] transition hover:bg-[#E8F3F0] disabled:opacity-50 md:hidden"
            >
              New chat
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
            {messages.length === 0 ? (
              <div className="flex min-h-[58vh] flex-col items-center justify-center text-center">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  What are you working on?
                </h2>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#5B6B66]">
                  Ask a question, paste some code, or start with one of these.
                </p>

                <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => submit(suggestion)}
                      className="rounded-xl border border-[#DCE4E1] bg-white px-4 py-3 text-left text-sm text-[#2B3A4A] transition hover:border-[#0F766E] hover:bg-[#E8F3F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}

            {/* Loading */}
            {status === "submitted" && (
              <div
                className="flex items-center gap-1.5 px-1"
                role="status"
                aria-label="Assistant is thinking"
              >
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 animate-bounce rounded-full bg-[#0F766E]"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div
                role="alert"
                className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p>
                  {error?.message ||
                    "The response failed. Check your connection and try again."}
                </p>
                <button
                  onClick={() => regenerate()}
                  className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                >
                  Try again
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <footer className="px-4 pb-4 pt-2">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-[#DCE4E1] bg-white p-2 shadow-sm transition focus-within:border-[#0F766E] focus-within:ring-4 focus-within:ring-[#0F766E]/10">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message your assistant"
                aria-label="Message"
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-[#0F1B2D] outline-none placeholder:text-[#8A9893]"
              />

              {isLoading ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  aria-label="Stop generating"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F1B2D] text-white transition hover:bg-[#1D2D45]"
                >
                  <span className="h-3 w-3 rounded-sm bg-white" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white transition hover:bg-[#0B5E58] disabled:cursor-not-allowed disabled:bg-[#C9D5D1]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>

            <p className="mt-2 text-center text-xs text-[#8A9893]">
              Enter to send, Shift + Enter for a new line. Check important
              information before relying on it.
            </p>
          </form>
        </footer>
      </section>
    </main>
  );
}