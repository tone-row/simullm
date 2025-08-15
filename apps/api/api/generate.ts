import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { getSystemPrompt } from "@simullm/codegen";
import { z } from "zod";

const generateSchema = z.object({
  code: z.string().describe("The TypeScript code for the simulation"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json() as { description?: string };
    
    console.log(`[API] Received generation request: "${body.description || 'no description'}"`);
    
    if (!body.description) {
      console.log('[API] Request rejected - missing description');
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[API] Starting code generation...');
    const systemPrompt = getSystemPrompt();
    
    const result = await generateObject({
      model: anthropic("claude-3-5-sonnet-20241022"),
      temperature: 0.1,
      system: systemPrompt,
      prompt: `Create a SimuLLM simulation for: ${body.description}`,
      schema: generateSchema,
      maxOutputTokens: 8000,
    });

    console.log('[API] Code generation completed successfully');
    
    return new Response(
      JSON.stringify({
        code: result.object.code,
        description: body.description,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error("[API] Code generation failed:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate simulation code",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export async function GET(request: Request) {
  return new Response(
    JSON.stringify({
      message: "Use POST method to generate simulations",
      usage: {
        method: "POST",
        body: {
          description: "Description of the simulation you want to generate"
        }
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}