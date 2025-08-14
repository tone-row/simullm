import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, UIMessage, tool, Tool } from "ai";
import { z } from "zod";
// import { getSystemPrompt } from "@simullm/codegen";

// Define the tool schema for file editing
const WriteFileSchema = z.object({
  content: z
    .string()
    .describe("The complete file content to write (replaces entire file)"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this file is being written"),
});

// Define custom UIMessage type for better type safety
export type SimullmUIMessage = UIMessage<
  Record<string, never>,
  Record<string, never>,
  { editFile: any }
>;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    console.log("Received messages:", messages);

    const systemPrompt = `xxx`;

    const result = streamText<SimullmUIMessage>({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools: {
        editFile: tool({
          description:
            "Write the entire simullm source file by replacing all contents with the provided code",
          parameters: WriteFileSchema,
          execute: async ({ content, reasoning }) => {
            // In a real app, you'd write this to a file
            // For now, we'll just return a success message
            console.log(`File updated: ${reasoning}`);
            return {
              success: true,
              message: `File successfully updated: ${reasoning}`,
              contentLength: content.length,
            };
          },
        }),
      },
      toolChoice: "auto",
      temperature: 0.1,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: ({ messages, responseMessage }) => {
        console.log("Chat finished, final messages:", messages);
        console.log("Response message:", responseMessage);
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
