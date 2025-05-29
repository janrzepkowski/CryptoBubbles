import { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as d3 from "d3";
import "./App.css";

function App() {
  const [coins, setCoins] = useState([]);
  const svgRef = useRef();

  const api_key = import.meta.env.VITE_API_COINGECKO_KEY;

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": api_key,
    },
  };

  const millionsFormat = d3.format("$,.0f");
  const percentFormat = d3.format(".2f");

  const createBubbleChart = (data) => {
    d3.select(svgRef.current).selectAll("*").remove();

    const width = window.innerWidth - 100;
    const height = window.innerHeight - 200;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const maxMarketCap = Math.max(...data.map((d) => d.market_cap));
    const minMarketCap = Math.min(...data.map((d) => d.market_cap));

    const processedData = data.map((coin) => {
      const normalizedSize =
        (coin.market_cap - minMarketCap) / (maxMarketCap - minMarketCap);
      const r = 20 + normalizedSize * 80;
      return {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        price: coin.current_price,
        change_24h: coin.price_change_percentage_24h,
        image: coin.image,
        x: r + Math.random() * (width - 2 * r),
        y: r + Math.random() * (height - 2 * r),
        r: r,
      };
    });

    const simulation = d3
      .forceSimulation(processedData)
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3
          .forceCollide()
          .radius((d) => d.r + 10)
          .iterations(3)
      )
      .force("x", d3.forceX(width / 2).strength(0.02))
      .force("y", d3.forceY(height / 2).strength(0.02))
      .stop();

    for (let i = 0; i < 800; ++i) simulation.tick();

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("font-size", "12px");

    const showTooltip = (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `
        <strong>${d.name} (${d.symbol})</strong><br/>
        Market Cap: ${millionsFormat(d.market_cap)}<br/>
        Price: $${d.price.toLocaleString()}<br/>
        24h Change: ${percentFormat(d.change_24h)}%<br/>
        Rank: #${d.market_cap_rank}
      `
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    };

    const hideTooltip = () => {
      tooltip.transition().duration(200).style("opacity", 0);
    };

    const nodes = svg
      .selectAll(".node")
      .data(processedData)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr(
        "transform",
        (d) =>
          `translate(${Math.max(d.r, Math.min(width - d.r, d.x))},${Math.max(
            d.r,
            Math.min(height - d.r, d.y)
          )})`
      )
      .on("mouseover", showTooltip)
      .on("mouseout", hideTooltip);

    nodes
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => {
        if (d.change_24h > 0) return "#22c55e";
        if (d.change_24h < 0) return "#ef4444";
        return "#6b7280";
      });

    nodes
      .append("image")
      .attr("x", (d) => -d.r * 0.3)
      .attr("y", (d) => -d.r * 0.5)
      .attr("width", (d) => d.r * 0.6)
      .attr("height", (d) => d.r * 0.6)
      .attr("href", (d) => d.image);

    nodes
      .append("text")
      .attr("dy", "0.1em")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .attr("font-size", (d) => Math.max(8, Math.min(d.r * 0.25, 18)))
      .text((d) => d.symbol);

    nodes
      .append("text")
      .attr("dy", "1.2em")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", (d) => Math.max(6, Math.min(d.r * 0.15, 12)))
      .text((d) => `${d.change_24h?.toFixed(1)}%`);
  };

  useEffect(() => {
    axios
      .get(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h",
        options
      )
      .then((res) => {
        setCoins(res.data);
        createBubbleChart(res.data);
      });

    return () => {
      d3.select("body").selectAll(".d3-tooltip").remove();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (coins.length > 0) {
        createBubbleChart(coins);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [coins]);

  return (
    <>
      <h1>Crypto Bubbles</h1>
      <div className="bubble-container">
        <svg ref={svgRef}></svg>
      </div>
    </>
  );
}

export default App;
