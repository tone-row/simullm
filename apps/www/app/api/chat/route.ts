import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { z } from "zod";
import { getSystemPrompt } from "@/lib/system-prompt";

const EditFileSchema = z.object({
  startLine: z.number().min(1).describe("The starting line number (1-based)"),
  endLine: z.number().min(1).describe("The ending line number (1-based)"),
  replacement: z.string().describe("The replacement code content"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this edit is being made"),
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  console.log("Received messages:", messages);

  const systemPrompt = getSystemPrompt();

  try {
    const result = streamText({
      model: openrouter("anthropic/claude-3.5-sonnet"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      tools: {
        editFile: {
          description:
            "Edit specific lines in the simullm source file with replacement code",
          parameters: EditFileSchema,
        },
      },
      toolChoice: "auto",
      temperature: 0.1,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
