import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import "dotenv/config";

// Simple test to verify LLM integration
export const testLLM = async () => {
  try {
    console.log("Testing LLM integration...");

    const result = await generateText({
      model: openai("gpt-4"),
      prompt: `You are a commodity trader. The current price is $100. 
      
      Respond with a JSON object in this exact format:
      {
        "action": "buy",
        "reasoning": "brief explanation",
        "price_change": 5,
        "volume_change": 100
      }
      
      Only respond with the JSON object, nothing else.`,
      maxTokens: 200,
    });

    console.log("LLM Response:", result.text);

    // Try to parse the response
    const parsed = JSON.parse(result.text);
    console.log("Parsed response:", parsed);

    return { success: true, response: parsed };
  } catch (error) {
    console.error("LLM test failed:", error);
    return { success: false, error };
  }
};
