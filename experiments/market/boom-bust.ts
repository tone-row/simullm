import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import "dotenv/config";
import { createEventSimulation, createAgent } from "../../lib/simulation.ts";

// Global state for the commodity market
interface MarketState {
  price: number;
  underlyingValue: number;
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
  position: number;
  memory: string[];
}

// Define market actions
type MarketAction = 
  | { type: "START" }
  | { type: "TURN_START"; turn: number }
  | { type: "ENVIRONMENTAL_UPDATE" }
  | { type: "TRADE_ACTION"; traderId: string; action: "buy" | "sell" | "hold"; reasoning: string }
  | { type: "PRICE_UPDATE"; newPrice: number }
  | { type: "TURN_END"; turn: number };

interface MarketFacilitatorState {
  currentTurn: number;
  maxTurns: number;
  traderOrder: string[];
  waitingFor: string[];
}

// Market facilitator manages turns and environmental changes
const marketFacilitator = createAgent<MarketState, MarketAction, MarketFacilitatorState>(
  "facilitator",
  (action, context) => {
    if (action.type === "START") {
      context.updateInternalState(state => ({
        ...state,
        currentTurn: 1
      }));
      context.dispatch({ type: "TURN_START", turn: 1 });
    }
    
    if (action.type === "TURN_START") {
      // Apply environmental growth
      context.dispatch({ type: "ENVIRONMENTAL_UPDATE" });
      
      // Reset waiting list for this turn
      context.updateInternalState(state => ({
        ...state,
        waitingFor: [...state.traderOrder]
      }));
    }
    
    if (action.type === "ENVIRONMENTAL_UPDATE") {
      const growthRate = 0.01; // 1% growth per turn
      context.updateGlobalState(state => ({
        ...state,
        underlyingValue: state.underlyingValue * (1 + growthRate)
      }));
    }
    
    if (action.type === "TRADE_ACTION") {
      // Remove trader from waiting list
      context.updateInternalState(state => ({
        ...state,
        waitingFor: state.waitingFor.filter((id: string) => id !== action.traderId)
      }));
      
      // If all traders have acted, end the turn
      if (context.internalState.waitingFor.length === 1) { // Only the trader we just removed
        setTimeout(() => {
          context.dispatch({ type: "TURN_END", turn: context.internalState.currentTurn });
        }, 0);
      }
    }
    
    if (action.type === "TURN_END") {
      const currentTurn = context.internalState.currentTurn;
      const nextTurn = currentTurn + 1;
      
      // Update history
      context.updateGlobalState(state => ({
        ...state,
        turn: currentTurn,
        history: {
          price: [...state.history.price, state.price],
          underlyingValue: [...state.history.underlyingValue, state.underlyingValue],
          turn: [...state.history.turn, currentTurn],
        }
      }));
      
      context.updateInternalState(state => ({
        ...state,
        currentTurn: nextTurn
      }));
      
      // Log turn results
      const state = context.globalState;
      console.log(`\n--- Turn ${currentTurn} ---`);
      console.log(
        `Price: $${state.price.toFixed(2)} | Underlying: $${state.underlyingValue.toFixed(2)}`
      );
      
      // Continue to next turn if not done
      if (nextTurn <= context.internalState.maxTurns) {
        context.dispatch({ type: "TURN_START", turn: nextTurn });
      }
    }
  },
  {
    currentTurn: 0,
    maxTurns: 10,
    traderOrder: ["value-trader", "trends-trader"],
    waitingFor: [],
  }
);

// Value trader agent
const createValueTrader = () => createAgent<MarketState, MarketAction, TraderState>(
  "value-trader",
  async (action, context) => {
    if (action.type === "TURN_START") {
      const globalState = context.globalState;
      const traderState = context.internalState;
      
      const prompt = `
You are a commodity trader with the following characteristics:
- Strategy: I am a value trader who follows a strict mathematical rule: if price < underlying_value then BUY, if price > underlying_value then SELL. I must state the exact comparison and correct action. For example: 'Price $110 vs Underlying $101: 110 > 101, so I SELL' or 'Price $100 vs Underlying $101: 100 < 101, so I BUY'. If price > underlying, I SELL. If price < underlying, I BUY.
- Current position: ${traderState.position} (positive = long, negative = short)

Current market conditions:
- Price: $${globalState.price}
- Underlying Value: $${globalState.underlyingValue}
- Turn: ${globalState.turn}
- Price History (last 5 turns): ${globalState.history.price
        .slice(-5)
        .map((p: number) => `$${p.toFixed(2)}`)
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

Only respond with the JSON object, nothing else.`;

      try {
        const result = await generateText({
          model: openai("gpt-4"),
          prompt,
          maxTokens: 200,
        });

        const response = JSON.parse(result.text);
        
        // Update memory
        context.updateInternalState((state: TraderState) => ({
          ...state,
          memory: [...state.memory, `${response.action}: ${response.reasoning}`].slice(-10)
        }));
        
        // Apply price impact
        if (response.action === "buy") {
          context.dispatch({ type: "PRICE_UPDATE", newPrice: globalState.price + 5 });
        } else if (response.action === "sell") {
          context.dispatch({ type: "PRICE_UPDATE", newPrice: globalState.price - 5 });
        }
        
        // Report action
        context.dispatch({ 
          type: "TRADE_ACTION", 
          traderId: "value-trader", 
          action: response.action, 
          reasoning: response.reasoning 
        });
        
        console.log(`Value Trader: ${response.action.toUpperCase()} - ${response.reasoning}`);
        
      } catch (error) {
        console.error("Error in value trader:", error);
        context.dispatch({ 
          type: "TRADE_ACTION", 
          traderId: "value-trader", 
          action: "hold", 
          reasoning: "Error occurred" 
        });
      }
    }
    
    if (action.type === "PRICE_UPDATE") {
      context.updateGlobalState(state => ({
        ...state,
        price: action.newPrice
      }));
    }
  },
  {
    strategy: "value",
    position: 0,
    memory: [],
  }
);

// Trends trader agent
const createTrendsTrader = () => createAgent<MarketState, MarketAction, TraderState>(
  "trends-trader",
  async (action, context) => {
    if (action.type === "TRADE_ACTION" && action.traderId === "value-trader") {
      // Trends trader acts after value trader
      const globalState = context.globalState;
      const traderState = context.internalState;
      
      const prompt = `
You are a commodity trader with the following characteristics:
- Strategy: I am a trends trader who follows market momentum and technical analysis. I look for price trends, moving averages, and market sentiment to make trading decisions. I believe that price movements tend to continue in the same direction.
- Current position: ${traderState.position} (positive = long, negative = short)

Current market conditions:
- Price: $${globalState.price}
- Underlying Value: $${globalState.underlyingValue}
- Turn: ${globalState.turn}
- Price History (last 5 turns): ${globalState.history.price
        .slice(-5)
        .map((p: number) => `$${p.toFixed(2)}`)
        .join(" → ")}

Your recent actions: ${traderState.memory.slice(-3).join(", ")}
The value trader just did: ${action.action.toUpperCase()} - ${action.reasoning}

Based on this information, decide what action to take. You can:
1. Buy (increase position)
2. Sell (decrease position)
3. Hold (no action)

IMPORTANT: You must respond with a JSON object in this EXACT format:
{
  "action": "buy|sell|hold", 
  "reasoning": "brief explanation of your decision"
}

Only respond with the JSON object, nothing else.`;

      try {
        const result = await generateText({
          model: openai("gpt-4"),
          prompt,
          maxTokens: 200,
        });

        const response = JSON.parse(result.text);
        
        // Update memory
        context.updateInternalState((state: TraderState) => ({
          ...state,
          memory: [...state.memory, `${response.action}: ${response.reasoning}`].slice(-10)
        }));
        
        // Apply price impact
        if (response.action === "buy") {
          context.dispatch({ type: "PRICE_UPDATE", newPrice: globalState.price + 5 });
        } else if (response.action === "sell") {
          context.dispatch({ type: "PRICE_UPDATE", newPrice: globalState.price - 5 });
        }
        
        // Report action
        context.dispatch({ 
          type: "TRADE_ACTION", 
          traderId: "trends-trader", 
          action: response.action, 
          reasoning: response.reasoning 
        });
        
        console.log(`Trends Trader: ${response.action.toUpperCase()} - ${response.reasoning}`);
        
      } catch (error) {
        console.error("Error in trends trader:", error);
        context.dispatch({ 
          type: "TRADE_ACTION", 
          traderId: "trends-trader", 
          action: "hold", 
          reasoning: "Error occurred" 
        });
      }
    }
    
    if (action.type === "PRICE_UPDATE") {
      context.updateGlobalState(state => ({
        ...state,
        price: action.newPrice
      }));
    }
  },
  {
    strategy: "trends",
    position: 0,
    memory: [],
  }
);

// Run the boom/bust simulation
export const runBoomBustExperiment = async () => {
  console.log("Starting Boom/Bust Cycle Experiment");
  console.log("==================================");
  
  const simulation = createEventSimulation<MarketState, MarketAction>({
    initialGlobalState: {
      price: 100,
      underlyingValue: 100,
      turn: 0,
      history: {
        price: [100],
        underlyingValue: [100],
        turn: [0],
      },
    },
    agents: [
      marketFacilitator,
      createValueTrader(),
      createTrendsTrader(),
    ],
  });

  console.log(`Initial price: $100, Underlying Value: $100`);

  // Start the simulation
  await simulation.dispatch({ type: "START" });
  
  // Wait for async processing to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  const finalState = simulation.getGlobalState();
  const facilitatorState = simulation.getAgentInternalState("facilitator");
  const valueTraderState = simulation.getAgentInternalState("value-trader");
  const trendsTraderState = simulation.getAgentInternalState("trends-trader");

  console.log("\n=== Final Results ===");
  console.log(`Final price: $${finalState.price.toFixed(2)}`);
  console.log(`Final underlying value: $${finalState.underlyingValue.toFixed(2)}`);
  console.log(
    `Price history: [${finalState.history.price
      .map((p: number) => p.toFixed(2))
      .join(", ")}]`
  );
  console.log(
    `Underlying value history: [${finalState.history.underlyingValue
      .map((v: number) => v.toFixed(2))
      .join(", ")}]`
  );

  return {
    finalState,
    facilitatorState,
    valueTraderState,
    trendsTraderState,
    totalTurns: facilitatorState.currentTurn - 1,
  };
};

// Run the experiment if this file is executed directly
if (import.meta.main) {
  runBoomBustExperiment().catch(console.error);
}
