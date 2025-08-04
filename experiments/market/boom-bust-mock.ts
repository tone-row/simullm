// Mock version of the boom/bust experiment for testing without API calls

// Global state for the commodity market
interface MarketState {
  price: number;
  volume: number;
  turn: number;
  history: {
    price: number[];
    volume: number[];
    turn: number[];
  };
}

// Trader internal state
interface TraderState {
  name: string;
  strategy: string;
  riskTolerance: number;
  capital: number;
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
) => Promise<StateUpdate>;

// Mock LLM response generator
const mockLLMResponse = (
  traderState: TraderState,
  marketState: MarketState
) => {
  const { name, strategy, riskTolerance } = traderState;
  const { price, volume } = marketState;

  // Simple deterministic logic based on trader characteristics
  let action = "hold";
  let reasoning = "No clear signal";
  let priceChange = 0;
  let volumeChange = 0;

  if (name.includes("Bullish")) {
    // Bullish trader tends to buy and push price up
    if (price < 120) {
      action = "buy";
      reasoning = "Price below target, buying opportunity";
      priceChange = Math.random() * 5 + 1; // +1 to +6
      volumeChange = Math.random() * 200 + 50; // +50 to +250
    } else {
      action = "hold";
      reasoning = "Price getting high, waiting for pullback";
    }
  } else if (name.includes("Bearish")) {
    // Bearish trader tends to sell and push price down
    if (price > 80) {
      action = "sell";
      reasoning = "Price above fair value, selling";
      priceChange = -(Math.random() * 3 + 1); // -1 to -4
      volumeChange = Math.random() * 150 + 30; // +30 to +180
    } else {
      action = "hold";
      reasoning = "Price already low, waiting for recovery";
    }
  }

  return {
    action,
    reasoning,
    price_change: priceChange,
    volume_change: volumeChange,
  };
};

// Create a trader with mock LLM-based decision making
const createMockTrader = (
  name: string,
  strategy: string,
  riskTolerance: number,
  initialCapital: number
): { id: string; action: TraderAction; state: TraderState } => {
  const action: TraderAction = async (globalState, traderState) => {
    // Simulate async delay like real LLM call
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get mock LLM response
    const response = mockLLMResponse(traderState, globalState);

    // Calculate state updates
    const updates: StateUpdate = {};

    if (response.price_change !== undefined) {
      updates.price = globalState.price + response.price_change;
    }

    if (response.volume_change !== undefined) {
      updates.volume = globalState.volume + response.volume_change;
    }

    // Update trader's memory
    traderState.memory.push(`${response.action}: ${response.reasoning}`);
    if (traderState.memory.length > 10) {
      traderState.memory.shift();
    }

    return updates;
  };

  return {
    id: name,
    action,
    state: {
      name,
      strategy,
      riskTolerance,
      capital: initialCapital,
      position: 0,
      memory: [],
    },
  };
};

// Run the boom/bust simulation with mock LLM
export const runBoomBustExperimentMock = async () => {
  // Create two traders with different strategies
  const bullishTrader = createMockTrader(
    "BullishTrader",
    "Aggressive growth strategy, believes in strong upward trends",
    8,
    10000
  );

  const bearishTrader = createMockTrader(
    "BearishTrader",
    "Conservative value strategy, looks for overvaluation",
    4,
    10000
  );

  // Initial market state
  let marketState: MarketState = {
    price: 100,
    volume: 1000,
    turn: 0,
    history: {
      price: [100],
      volume: [1000],
      turn: [0],
    },
  };

  const maxTurns = 10;
  console.log("Starting Boom/Bust Cycle Experiment (Mock LLM)");
  console.log("==============================================");
  console.log(
    `Initial price: $${marketState.price}, Volume: ${marketState.volume}`
  );

  for (let turn = 1; turn <= maxTurns; turn++) {
    console.log(`\n--- Turn ${turn} ---`);

    // Execute trader actions asynchronously
    const [bullishUpdate, bearishUpdate] = await Promise.all([
      bullishTrader.action(marketState, bullishTrader.state),
      bearishTrader.action(marketState, bearishTrader.state),
    ]);

    // Merge updates into global state
    marketState = {
      ...marketState,
      ...bullishUpdate,
      ...bearishUpdate,
      turn,
      history: {
        price: [...marketState.history.price, marketState.price],
        volume: [...marketState.history.volume, marketState.volume],
        turn: [...marketState.history.turn, turn],
      },
    };

    console.log(`Price: $${marketState.price.toFixed(2)}`);
    console.log(`Volume: ${marketState.volume.toFixed(0)}`);
    console.log(
      `Bullish trader memory: ${bullishTrader.state.memory.slice(-1)[0]}`
    );
    console.log(
      `Bearish trader memory: ${bearishTrader.state.memory.slice(-1)[0]}`
    );
  }

  console.log("\n=== Final Results ===");
  console.log(`Final price: $${marketState.price.toFixed(2)}`);
  console.log(`Final volume: ${marketState.volume.toFixed(0)}`);
  console.log(
    "Price history:",
    marketState.history.price.map((p) => p.toFixed(2))
  );

  return {
    finalState: marketState,
    bullishTrader: bullishTrader.state,
    bearishTrader: bearishTrader.state,
  };
};
