
"use client";

import type { Conversation } from "@/types/chat";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export default function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: ChatSidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-gray-200 bg-white">
      <div className="border-b p-4">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          AI Assistant
        </h2>

        <button
          onClick={onNewChat}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Recent Conversations
        </p>

        {conversations.length === 0 ? (
          <p className="px-2 text-sm text-gray-400">
            No conversations yet.
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 rounded-lg p-2 ${
                  activeId === conversation.id
                    ? "bg-blue-50"
                    : "hover:bg-gray-100"
                }`}
              >
                <button
                  onClick={() => onSelect(conversation.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-gray-700"
                >
                  {conversation.title}
                </button>

                <button
                  onClick={() => onDelete(conversation.id)}
                  title="Delete conversation"
                  aria-label={`Delete ${conversation.title}`}
                  className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
