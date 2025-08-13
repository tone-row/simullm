// import { runCounterExample } from "./experiments/counter/simple.ts";
// import { runEcosystemExample } from "./experiments/ecosystem/predator-prey.ts";
import { runBoomBustExperiment } from "./experiments/market/boom-bust.ts";
import { writeFileSync } from "fs";

console.log("ABM Framework Demo");
console.log("==================");

// // Run the counter example
// console.log("\n1. Simple Counter Example:");
// await runCounterExample();

// // Run the ecosystem example
// console.log("\n2. Ecosystem Simulation Example:");
// await runEcosystemExample();

// Run the boom/bust experiment (real LLM)
console.log("\n3. Boom/Bust Cycle Experiment (Real LLM):");
const result = await runBoomBustExperiment();

// Generate HTML visualization
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boom/Bust Cycle Experiment Results</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .chart-container {
            margin: 30px 0;
        }
        .chart-title {
            text-align: center;
            margin-bottom: 20px;
            color: #333;
            font-size: 1.2em;
        }
        .axis-label {
            font-size: 12px;
            fill: #666;
        }
        .grid line {
            stroke: #ddd;
            stroke-opacity: 0.7;
        }
        .grid path {
            stroke-width: 0;
        }
        .line-price {
            fill: none;
            stroke: #667eea;
            stroke-width: 3;
        }
        .line-underlying {
            fill: none;
            stroke: #764ba2;
            stroke-width: 3;
            stroke-dasharray: 5,5;
        }
        .area {
            fill: url(#gradient);
            opacity: 0.3;
        }
        .dot-price {
            fill: #667eea;
            stroke: white;
            stroke-width: 2;
        }
        .dot-underlying {
            fill: #764ba2;
            stroke: white;
            stroke-width: 2;
        }
        .dot-price:hover, .dot-underlying:hover {
            cursor: pointer;
        }
        .legend {
            font-size: 12px;
        }
        .legend-item {
            display: inline-block;
            margin-right: 20px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 3px;
            margin-right: 5px;
        }
        .tooltip {
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Boom/Bust Cycle Experiment Results</h1>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">$${result.finalState.price.toFixed(
                  2
                )}</div>
                <div class="stat-label">Final Price</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${result.finalState.underlyingValue.toFixed(
                  2
                )}</div>
                <div class="stat-label">Final Underlying Value</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${result.totalTurns}</div>
                <div class="stat-label">Total Turns</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(
                  (result.finalState.price / 100 - 1) *
                  100
                ).toFixed(1)}%</div>
                <div class="stat-label">Price Change</div>
            </div>
        </div>

        <div class="chart-container">
            <div class="chart-title">Price vs Underlying Value Over Time</div>
            <div id="combined-chart"></div>
        </div>
    </div>

    <script>
        // Data from the experiment
        const data = ${JSON.stringify(
          result.finalState.history.price.map((price: number, i: number) => ({
            turn: result.finalState.history.turn[i],
            price: price,
            underlyingValue: result.finalState.history.underlyingValue[i],
          }))
        )};

        // Combined chart
        const margin = {top: 20, right: 30, bottom: 40, left: 60};
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#combined-chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Add gradient for price area
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0).attr("y1", height)
            .attr("x2", 0).attr("y2", 0);

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#667eea")
            .attr("stop-opacity", 0.8);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#667eea")
            .attr("stop-opacity", 0.1);

        // Scales - combine both price and underlying value ranges
        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.turn)])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                Math.min(d3.min(data, d => d.price), d3.min(data, d => d.underlyingValue)) * 0.95,
                Math.max(d3.max(data, d => d.price), d3.max(data, d => d.underlyingValue)) * 1.05
            ])
            .range([height, 0]);

        // Grid
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));

        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

        // Price area
        const priceArea = d3.area()
            .x(d => x(d.turn))
            .y0(height)
            .y1(d => y(d.price));

        // Add price area
        svg.append("path")
            .datum(data)
            .attr("class", "area")
            .attr("d", priceArea);

        // Lines
        const priceLine = d3.line()
            .x(d => x(d.turn))
            .y(d => y(d.price));

        const underlyingLine = d3.line()
            .x(d => x(d.turn))
            .y(d => y(d.underlyingValue));

        // Add price line
        svg.append("path")
            .datum(data)
            .attr("class", "line-price")
            .attr("d", priceLine);

        // Add underlying value line
        svg.append("path")
            .datum(data)
            .attr("class", "line-underlying")
            .attr("d", underlyingLine);

        // Add price dots
        svg.selectAll(".dot-price")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot-price")
            .attr("cx", d => x(d.turn))
            .attr("cy", d => y(d.price))
            .attr("r", 4);

        // Add underlying value dots
        svg.selectAll(".dot-underlying")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot-underlying")
            .attr("cx", d => x(d.turn))
            .attr("cy", d => y(d.underlyingValue))
            .attr("r", 4);

        // Axes
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("text-anchor", "middle");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("text-anchor", "end");

        // Labels
        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + 35)
            .text("Turn");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .text("Value ($)");

        // Add legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + (width - 200) + ", 20)");

        legend.append("g")
            .attr("class", "legend-item")
            .append("line")
            .attr("class", "legend-color")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 0)
            .attr("y2", 0)
            .style("stroke", "#667eea")
            .style("stroke-width", 3);

        legend.append("text")
            .attr("x", 25)
            .attr("y", 4)
            .text("Price");

        legend.append("g")
            .attr("class", "legend-item")
            .attr("transform", "translate(0, 20)")
            .append("line")
            .attr("class", "legend-color")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 0)
            .attr("y2", 0)
            .style("stroke", "#764ba2")
            .style("stroke-width", 3)
            .style("stroke-dasharray", "5,5");

        legend.append("text")
            .attr("x", 25)
            .attr("y", 24)
            .text("Underlying Value");


    </script>
</body>
</html>
`;

// Write the HTML file
writeFileSync("boom-bust-results.html", htmlContent);
console.log("\n📊 HTML visualization generated: boom-bust-results.html");
console.log("Open this file in your browser to see the interactive charts!");
