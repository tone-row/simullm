// import { runCounterExample } from "./src/example.ts";
// import { runEcosystemExample } from "./src/ecosystem-example.ts";
import { runBoomBustExperiment } from "./src/boom-bust-experiment.ts";
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
        .line {
            fill: none;
            stroke: #667eea;
            stroke-width: 3;
        }
        .area {
            fill: url(#gradient);
            opacity: 0.3;
        }
        .dot {
            fill: #667eea;
            stroke: white;
            stroke-width: 2;
        }
        .dot:hover {
            fill: #764ba2;
            cursor: pointer;
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
            <div class="chart-title">Price History Over Time</div>
            <div id="price-chart"></div>
        </div>

        <div class="chart-container">
            <div class="chart-title">Underlying Value History Over Time</div>
            <div id="underlying-value-chart"></div>
        </div>
    </div>

    <script>
        // Data from the experiment
        const data = ${JSON.stringify(
          result.priceHistory.map((price, i) => ({
            turn: result.turnHistory[i],
            price: price,
            underlyingValue: result.underlyingValueHistory[i],
          }))
        )};

        // Price chart
        const priceMargin = {top: 20, right: 30, bottom: 40, left: 60};
        const priceWidth = 800 - priceMargin.left - priceMargin.right;
        const priceHeight = 400 - priceMargin.top - priceMargin.bottom;

        const priceSvg = d3.select("#price-chart")
            .append("svg")
            .attr("width", priceWidth + priceMargin.left + priceMargin.right)
            .attr("height", priceHeight + priceMargin.top + priceMargin.bottom)
            .append("g")
            .attr("transform", "translate(" + priceMargin.left + "," + priceMargin.top + ")");

        // Add gradient
        const gradient = priceSvg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0).attr("y1", priceHeight)
            .attr("x2", 0).attr("y2", 0);

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#667eea")
            .attr("stop-opacity", 0.8);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#667eea")
            .attr("stop-opacity", 0.1);

        // Scales
        const priceX = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.turn)])
            .range([0, priceWidth]);

        const priceY = d3.scaleLinear()
            .domain([d3.min(data, d => d.price) * 0.95, d3.max(data, d => d.price) * 1.05])
            .range([priceHeight, 0]);

        // Grid
        priceSvg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + priceHeight + ")")
            .call(d3.axisBottom(priceX).tickSize(-priceHeight).tickFormat(""));

        priceSvg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(priceY).tickSize(-priceWidth).tickFormat(""));

        // Line
        const priceLine = d3.line()
            .x(d => priceX(d.turn))
            .y(d => priceY(d.price));

        // Area
        const priceArea = d3.area()
            .x(d => priceX(d.turn))
            .y0(priceHeight)
            .y1(d => priceY(d.price));

        // Add area
        priceSvg.append("path")
            .datum(data)
            .attr("class", "area")
            .attr("d", priceArea);

        // Add line
        priceSvg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", priceLine);

        // Add dots
        priceSvg.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => priceX(d.turn))
            .attr("cy", d => priceY(d.price))
            .attr("r", 4);

        // Axes
        priceSvg.append("g")
            .attr("transform", "translate(0," + priceHeight + ")")
            .call(d3.axisBottom(priceX))
            .selectAll("text")
            .style("text-anchor", "middle");

        priceSvg.append("g")
            .call(d3.axisLeft(priceY))
            .selectAll("text")
            .style("text-anchor", "end");

        // Labels
        priceSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", priceWidth / 2)
            .attr("y", priceHeight + 35)
            .text("Turn");

        priceSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -priceHeight / 2)
            .attr("y", -40)
            .text("Price ($)");

        // Underlying Value chart
        const underlyingValueMargin = {top: 20, right: 30, bottom: 40, left: 60};
        const underlyingValueWidth = 800 - underlyingValueMargin.left - underlyingValueMargin.right;
        const underlyingValueHeight = 400 - underlyingValueMargin.top - underlyingValueMargin.bottom;

        const underlyingValueSvg = d3.select("#underlying-value-chart")
            .append("svg")
            .attr("width", underlyingValueWidth + underlyingValueMargin.left + underlyingValueMargin.right)
            .attr("height", underlyingValueHeight + underlyingValueMargin.top + underlyingValueMargin.bottom)
            .append("g")
            .attr("transform", "translate(" + underlyingValueMargin.left + "," + underlyingValueMargin.top + ")");

        // Underlying Value scales
        const underlyingValueX = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.turn)])
            .range([0, underlyingValueWidth]);

        const underlyingValueY = d3.scaleLinear()
            .domain([d3.min(data, d => d.underlyingValue) * 0.95, d3.max(data, d => d.underlyingValue) * 1.05])
            .range([underlyingValueHeight, 0]);

        // Underlying Value line
        const underlyingValueLine = d3.line()
            .x(d => underlyingValueX(d.turn))
            .y(d => underlyingValueY(d.underlyingValue));

        // Add underlying value line
        underlyingValueSvg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("stroke", "#764ba2")
            .attr("d", underlyingValueLine);

        // Add underlying value dots
        underlyingValueSvg.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("fill", "#764ba2")
            .attr("cx", d => underlyingValueX(d.turn))
            .attr("cy", d => underlyingValueY(d.underlyingValue))
            .attr("r", 4);

        // Underlying Value axes
        underlyingValueSvg.append("g")
            .attr("transform", "translate(0," + underlyingValueHeight + ")")
            .call(d3.axisBottom(underlyingValueX))
            .selectAll("text")
            .style("text-anchor", "middle");

        underlyingValueSvg.append("g")
            .call(d3.axisLeft(underlyingValueY))
            .selectAll("text")
            .style("text-anchor", "end");

        // Underlying Value labels
        underlyingValueSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", underlyingValueWidth / 2)
            .attr("y", underlyingValueHeight + 35)
            .text("Turn");

        underlyingValueSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -underlyingValueHeight / 2)
            .attr("y", -40)
            .text("Underlying Value ($)");
    </script>
</body>
</html>
`;

// Write the HTML file
writeFileSync("boom-bust-results.html", htmlContent);
console.log("\n📊 HTML visualization generated: boom-bust-results.html");
console.log("Open this file in your browser to see the interactive charts!");
