import { groq } from "@ai-sdk/groq";
import { streamText, convertToModelMessages } from "ai";
import { NextRequest } from "next/server";

// llama-3.3-70b-versatile was retired by Groq on 16 Aug 2026.
// Groq's recommended replacements: openai/gpt-oss-120b or qwen/qwen3.6-27b
const MODEL_ID = "openai/gpt-oss-120b";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    // Limit conversation length
    if (messages.length > 50) {
      return Response.json(
        { error: "Too many messages" },
        { status: 400 }
      );
    }

    // Validate Groq API key
    if (!process.env.GROQ_API_KEY?.trim()) {
      console.error("GROQ_API_KEY is missing");

      return Response.json(
        { error: "Groq API key is not configured" },
        { status: 500 }
      );
    }

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Generate streaming AI response
    const result = streamText({
      model: groq(MODEL_ID),

      system:
        "You are a helpful AI assistant. Give clear, accurate, and useful responses.",

      messages: modelMessages,

      temperature: 0.7,

      onError({ error }) {
        console.error("Groq streaming error:", error);
      },

      onFinish({ text, usage }) {
        console.log("AI response completed", {
          textLength: text?.length ?? 0,
          usage,
        });
      },
    });

    // Return a stream compatible with useChat
    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("UI message stream error:", error);

        // Show the real error in development, hide provider details in production
        if (process.env.NODE_ENV === "development") {
          return error instanceof Error ? error.message : String(error);
        }

        return "Unable to generate an AI response. Please try again.";
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      {
        error: "Unable to process your request. Please try again.",
      },
      { status: 500 }
    );
  }
}