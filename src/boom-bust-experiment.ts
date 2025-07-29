import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import "dotenv/config";

// Global state for the commodity market
interface MarketState {
  price: number;
  underlyingValue: number; // The true intrinsic value of the stock
  turn: number;
  history: {
    price: number[];
    underlyingValue: number[];
    turn: number[];
  };
}

// Trader internal state
interface TraderState {
  strategy: string;
  position: number; // positive = long, negative = short
  memory: string[]; // remember previous actions
}

// Action result that updates global state
interface StateUpdate {
  price?: number;
  volume?: number;
  [key: string]: any; // allow other updates
}

// Trader action that returns state updates
type TraderAction = (
  globalState: MarketState,
  traderState: TraderState
) => Promise<{ updates: StateUpdate; response: any }>;

// Create a trader with LLM-based decision making
const createTrader = (
  strategy: string
): { id: string; action: TraderAction; state: TraderState } => {
  const action: TraderAction = async (globalState, traderState) => {
    // Create prompt for the LLM
    const prompt = `
You are a commodity trader with the following characteristics:
- Strategy: ${strategy}
- Current position: ${traderState.position} (positive = long, negative = short)

Current market conditions:
- Price: $${globalState.price}
- Underlying Value: $${globalState.underlyingValue}
- Turn: ${globalState.turn}
- Price History (last 5 turns): ${globalState.history.price
      .slice(-5)
      .map((p) => `$${p.toFixed(2)}`)
      .join(" → ")}

Your recent actions: ${traderState.memory.slice(-3).join(", ")}

Based on this information, decide what action to take. You can:
1. Buy (increase position)
2. Sell (decrease position)
3. Hold (no action)

IMPORTANT: You must respond with a JSON object in this EXACT format:
{
  "action": "buy|sell|hold",
  "reasoning": "brief explanation of your decision"
}

Examples of valid responses:
- If you want to buy: {"action": "buy", "reasoning": "Price looks good"}
- If you want to sell: {"action": "sell", "reasoning": "Price too high"}
- If you want to hold: {"action": "hold", "reasoning": "No clear signal"}

Only respond with the JSON object, nothing else.`;

    try {
      const result = await generateText({
        model: openai("gpt-4"),
        prompt,
        maxTokens: 200,
      });

      // Parse the LLM response
      const response = JSON.parse(result.text);

      // Calculate state updates based on action
      const updates: StateUpdate = {};

      // Automatic price changes based on action
      if (response.action === "buy") {
        updates.price = globalState.price + 5; // Buy action pushes price up
      } else if (response.action === "sell") {
        updates.price = globalState.price - 5; // Sell action pushes price down
      }
      // Hold action doesn't change price

      // Update trader's memory
      traderState.memory.push(`${response.action}: ${response.reasoning}`);
      if (traderState.memory.length > 10) {
        traderState.memory.shift();
      }

      return { updates, response };
    } catch (error) {
      console.error(`Error in trader action:`, error);
      // Fallback: no action
      return { updates: {}, response: {} };
    }
  };

  return {
    id: strategy,
    action,
    state: {
      strategy,
      position: 0,
      memory: [],
    },
  };
};

// Environmental state transition: underlying value grows over time
const environmentalTransition = (state: MarketState): MarketState => {
  const growthRate = 0.01; // 1% growth per turn
  const newUnderlyingValue = state.underlyingValue * (1 + growthRate);

  return {
    ...state,
    underlyingValue: newUnderlyingValue,
  };
};

// Run the boom/bust simulation
export const runBoomBustExperiment = async () => {
  // Create two traders with different strategies
  const valueTrader = createTrader(
    "I am a value trader who follows a strict mathematical rule: if price < underlying_value then BUY, if price > underlying_value then SELL. I must state the exact comparison and correct action. For example: 'Price $110 vs Underlying $101: 110 > 101, so I SELL' or 'Price $100 vs Underlying $101: 100 < 101, so I BUY'. If price > underlying, I SELL. If price < underlying, I BUY."
  );

  const trendsTrader = createTrader(
    "I am a trends trader who follows market momentum and technical analysis. I look for price trends, moving averages, and market sentiment to make trading decisions. I believe that price movements tend to continue in the same direction."
  );

  // Initial market state
  let marketState: MarketState = {
    price: 100,
    underlyingValue: 100, // Initial underlying value
    turn: 0,
    history: {
      price: [100],
      underlyingValue: [100],
      turn: [0],
    },
  };

  const maxTurns = 5;
  console.log("Starting Boom/Bust Cycle Experiment");
  console.log("==================================");
  console.log(
    `Initial price: $${marketState.price}, Underlying Value: $${marketState.underlyingValue}`
  );

  for (let turn = 1; turn <= maxTurns; turn++) {
    console.log(`\n--- Turn ${turn} ---`);

    // Apply environmental transition
    marketState = environmentalTransition(marketState);

    // Execute trader actions sequentially so each sees the previous agent's updates
    const valueResult = await valueTrader.action(
      marketState,
      valueTrader.state
    );

    // Apply value trader's updates to get intermediate state
    const intermediateState = {
      ...marketState,
      ...valueResult.updates,
      turn,
    };

    const trendsResult = await trendsTrader.action(
      intermediateState,
      trendsTrader.state
    );

    // Merge all updates into final state
    const updatedState = {
      ...intermediateState,
      ...trendsResult.updates,
      turn,
    };

    // Update history with the new state
    marketState = {
      ...updatedState,
      history: {
        price: [...marketState.history.price, updatedState.price],
        underlyingValue: [
          ...marketState.history.underlyingValue,
          updatedState.underlyingValue,
        ],
        turn: [...marketState.history.turn, turn],
      },
    };

    console.log(
      `Price: $${marketState.price.toFixed(
        2
      )} | Underlying: $${marketState.underlyingValue.toFixed(2)}`
    );

    // Log agent actions and reasoning
    console.log(
      `Value Trader: ${valueResult.response.action.toUpperCase()} - ${
        valueResult.response.reasoning
      }`
    );
    console.log(
      `Trends Trader: ${trendsResult.response.action.toUpperCase()} - ${
        trendsResult.response.reasoning
      }`
    );
  }

  console.log("\n=== Final Results ===");
  console.log(`Final price: $${marketState.price.toFixed(2)}`);
  console.log(
    `Final underlying value: $${marketState.underlyingValue.toFixed(2)}`
  );
  console.log(
    `Price history: [${marketState.history.price
      .map((p) => p.toFixed(2))
      .join(", ")}]`
  );
  console.log(
    `Underlying value history: [${marketState.history.underlyingValue
      .map((v) => v.toFixed(2))
      .join(", ")}]`
  );

  return {
    finalState: marketState,
    valueTrader: valueTrader.state,
    trendsTrader: trendsTrader.state,
    priceHistory: marketState.history.price,
    underlyingValueHistory: marketState.history.underlyingValue,
    turnHistory: marketState.history.turn,
    totalTurns: maxTurns,
  };
};

// Run the experiment if this file is executed directly
if (require.main === module) {
  runBoomBustExperiment().catch(console.error);
}
