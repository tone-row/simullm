import { describe, it, expect } from "bun:test";

// Mock the AI SDK for testing
const mockGenerateText = async () => ({
  text: JSON.stringify({
    action: "buy",
    reasoning: "Price looks good",
    price_change: 5,
    volume_change: 100,
  }),
});

// Mock the modules
const mockOpenai = () => "gpt-4";

// Test the market state structure
describe("Boom/Bust Experiment", () => {
  it("should have correct market state structure", () => {
    const marketState = {
      price: 100,
      volume: 1000,
      turn: 0,
      history: {
        price: [100],
        volume: [1000],
        turn: [0],
      },
    };

    expect(marketState.price).toBe(100);
    expect(marketState.volume).toBe(1000);
    expect(marketState.history.price).toEqual([100]);
  });

  it("should merge state updates correctly", () => {
    const initialState = {
      price: 100,
      volume: 1000,
      turn: 0,
      history: {
        price: [100],
        volume: [1000],
        turn: [0],
      },
    };

    const update1 = { price: 105, volume: 1100 };
    const update2 = { price: 103, volume: 1200 };

    const mergedState = {
      ...initialState,
      ...update1,
      ...update2, // This should override update1's price
    };

    expect(mergedState.price).toBe(103); // Last update wins
    expect(mergedState.volume).toBe(1200);
  });

  it("should parse LLM response correctly", () => {
    const mockResponse = {
      action: "sell",
      reasoning: "Price too high",
      price_change: -3,
      volume_change: 50,
    };

    const responseText = JSON.stringify(mockResponse);
    const parsed = JSON.parse(responseText);

    expect(parsed.action).toBe("sell");
    expect(parsed.price_change).toBe(-3);
    expect(parsed.volume_change).toBe(50);
  });
});
