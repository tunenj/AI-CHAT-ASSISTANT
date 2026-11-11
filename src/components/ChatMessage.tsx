"use client";

import { useState } from "react";
import type { UIMessage } from "ai";

interface ChatMessageProps {
  message: UIMessage;
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string; lang: string };

// Split text into plain text and fenced ``` code blocks
function splitSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const fence = /```([\w+-]*)\n?([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({
      kind: "code",
      lang: match[1] || "",
      value: match[2].replace(/\n$/, ""),
    });
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) fence.lastIndex++;
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

// Render **bold** and `inline code` inside a line of text
function renderInline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((chunk, index) => {
    if (chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4) {
      return (
        <strong key={index} className="font-semibold text-[#F2EEFA]">
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    if (chunk.startsWith("`") && chunk.endsWith("`") && chunk.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-[#241E38] px-1.5 py-0.5 text-[0.88em] text-[#FFD58A]"
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{chunk}</span>;
  });
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#2A2440] bg-[#0A0812]">
      <div className="flex items-center justify-between border-b border-[#241E38] px-4 py-2 text-xs text-[#9C94B8]">
        <span>{lang || "code"}</span>
        <button
          onClick={copy}
          className="rounded-md px-2 py-1 transition hover:bg-[#1A1530] hover:text-[#F2EEFA]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-[#E6E0F5]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function getText(message: UIMessage): string {
  const parts = Array.isArray(message.parts) ? message.parts : [];

  const fromParts = parts
    .map((part) =>
      part.type === "text" && typeof part.text === "string" ? part.text : ""
    )
    .join("");

  if (fromParts) return fromParts;

  // Fallback for older message shapes that used `content`
  const legacy = (message as { content?: unknown }).content;
  return typeof legacy === "string" ? legacy : "";
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const text = getText(message);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-[#2F2749] bg-[#1C1730] px-4 py-3 text-[15px] leading-relaxed text-[#F2EEFA]">
          {text}
        </div>
      </div>
    );
  }

  // Skip assistant messages that have no visible text yet (e.g. reasoning only)
  if (!text) return null;

  return (
    <div className="flex gap-3">
      <div
        aria-hidden
        className="mt-1 h-7 w-7 shrink-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, #FFE2A8 0%, #FFB547 35%, #E8658C 70%, #5B3FB8 100%)",
        }}
      />
      <div className="min-w-0 flex-1 text-[15px] leading-[1.75] text-[#DDD6EE]">
        {splitSegments(text).map((segment, index) =>
          segment.kind === "code" ? (
            <CodeBlock key={index} code={segment.value} lang={segment.lang} />
          ) : (
            <div key={index} className="whitespace-pre-wrap break-words">
              {renderInline(segment.value)}
            </div>
          )
        )}
      </div>
    </div>
  );
}