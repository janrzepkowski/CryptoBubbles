import { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as d3 from "d3";
import "./App.css";

function App() {
  const [coins, setCoins] = useState([]);
  const [activeTimeframe, setActiveTimeframe] = useState("24h");
  const [loading, setLoading] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const svgRef = useRef();
  const refreshIntervalRef = useRef();
  const progressIntervalRef = useRef();

  const api_key = import.meta.env.VITE_API_COINGECKO_KEY;

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": api_key,
    },
  };

  const timeframes = {
    "1h": {
      label: "1 Hour",
      key: "price_change_percentage_1h_in_currency",
      display: "1h",
    },
    "24h": {
      label: "24 Hours",
      key: "price_change_percentage_24h_in_currency",
      display: "24h",
    },
    "7d": {
      label: "7 Days",
      key: "price_change_percentage_7d_in_currency",
      display: "7d",
    },
    "14d": {
      label: "14 Days",
      key: "price_change_percentage_14d_in_currency",
      display: "14d",
    },
    "30d": {
      label: "30 Days",
      key: "price_change_percentage_30d_in_currency",
      display: "30d",
    },
    "200d": {
      label: "200 Days",
      key: "price_change_percentage_200d_in_currency",
      display: "200d",
    },
    "1y": {
      label: "1 Year",
      key: "price_change_percentage_1y_in_currency",
      display: "1y",
    },
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C14d%2C30d%2C200d%2C1y",
        options
      );
      setCoins(response.data);
      createBubbleChart(response.data, activeTimeframe);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startProgressBar = () => {
    setRefreshProgress(0);
    const duration = 60000; // 60 seconds
    const interval = 100; // Update every 100ms
    const increment = (interval / duration) * 100;

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setRefreshProgress((prev) => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(progressIntervalRef.current);
          return 0;
        }
        return newProgress;
      });
    }, interval);
  };

  const createBubbleChart = (data, timeframe) => {
    d3.select(svgRef.current).selectAll("*").remove();
    d3.select("body").selectAll(".tooltip").remove();

    const width = window.innerWidth - 500;
    const height = window.innerHeight;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("border-radius", "5px");

    const changeKey = timeframes[timeframe].key;

    data.forEach((el) => {
      let changeValue = el[changeKey];

      if (changeValue === null || changeValue === undefined) {
        changeValue = 0;
      }

      el.currentChange = changeValue;

      if (Math.abs(changeValue) > 100) {
        el["change"] = "crazy";
      } else if (changeValue > 0) {
        el["change"] = "up";
      } else if (changeValue < 0) {
        el["change"] = "down";
      } else {
        el["change"] = "zero";
      }
    });

    data.forEach((el) => {
      if (el.market_cap > 1000000000) {
        el["toolMC"] = `$${(el.market_cap / 1000000000).toFixed(2)}B`;
      } else {
        el["toolMC"] = `$${(el.market_cap / 1000000).toFixed(2)}M`;
      }
    });

    data.forEach((el) => {
      if (el.total_volume > 1000000000) {
        el["toolTV"] = `$${(el.total_volume / 1000000000).toFixed(2)}B`;
      } else {
        el["toolTV"] = `$${(el.total_volume / 1000000).toFixed(2)}M`;
      }
    });

    data.forEach((el) => {
      if (el.currentChange > 0) {
        el["toolPC"] = `+${el.currentChange.toFixed(2)}%`;
      } else {
        el["toolPC"] = `${el.currentChange.toFixed(2)}%`;
      }
    });

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    });

    function getMaxChange() {
      let maxChange = 0;
      data.forEach((coin) => {
        if (Math.abs(coin.currentChange) > maxChange) {
          maxChange = Math.abs(coin.currentChange);
        }
      });
      return Math.max(maxChange, 1);
    }

    const maxChange = getMaxChange();

    const colorScale = d3
      .scaleLinear()
      .domain([-maxChange, 0, maxChange])
      .range(["#ff0000", "#808080", "#00ff00"])
      .clamp(true);

    const size = d3
      .scaleLinear()
      .domain([0, (maxChange * 2.5) / 15, maxChange])
      .range([15, 40, 60]);

    const y = d3
      .scaleOrdinal()
      .domain(["up", "down", "zero"])
      .range([150, 350, 250]);

    const tooltip = d3
      .select("body")
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "10px")
      .style("border-radius", "5px")
      .style("position", "absolute")
      .style("border", "solid 2px")
      .style("pointer-events", "none");

    const mouseover = function (event, d) {
      tooltip.style("opacity", 1);
    };

    const mousemove = function (event, d) {
      const tooltipHeight = 200;
      const margin = 20;

      let tooltipX = event.pageX + 20;
      let tooltipY = event.pageY - 30;

      if (tooltipY + tooltipHeight > window.innerHeight) {
        tooltipY = event.pageY - tooltipHeight - 20;
      }

      if (tooltipY < margin) {
        tooltipY = margin;
      }

      tooltip
        .html(
          `Name: <strong>${d.name}</strong><br/>` +
            `Symbol: <strong>${d.symbol.toUpperCase()}</strong><br/>` +
            `Current Price: <strong>${formatter.format(
              d.current_price
            )}</strong><br/>` +
            `${timeframes[timeframe].display} Change: <strong>${d.toolPC}</strong><br/>` +
            `High 24Hr: <strong>${formatter.format(
              d["high_24h"]
            )}</strong><br/>` +
            `Low 24Hr: <strong>${formatter.format(
              d["low_24h"]
            )}</strong><br/>` +
            `Rank: <strong>${d.market_cap_rank}</strong><br/>` +
            `Market Cap: <strong>${d.toolMC}</strong><br/>` +
            `24H Volume: <strong>${d.toolTV}</strong>`
        )
        .style("left", tooltipX + "px")
        .style("top", tooltipY + "px")
        .style("border-color", colorScale(d.currentChange));
    };

    const mouseleave = function (event, d) {
      tooltip.style("opacity", 0);
    };

    const node = svg
      .append("g")
      .selectAll("g.bubble")
      .data(data)
      .join("g")
      .attr("class", "bubble")
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    node
      .append("circle")
      .attr("r", (d) => size(Math.abs(d.currentChange)))
      .style("fill", (d) => colorScale(d.currentChange))
      .style("fill-opacity", 0.8)
      .attr("stroke", (d) => colorScale(d.currentChange))
      .style("stroke-width", 2);

    node
      .append("image")
      .attr("xlink:href", (d) => d.image)
      .attr("x", (d) => -size(Math.abs(d.currentChange)) * 0.3)
      .attr("y", (d) => -size(Math.abs(d.currentChange)) * 0.5)
      .attr("width", (d) => size(Math.abs(d.currentChange)) * 0.6)
      .attr("height", (d) => size(Math.abs(d.currentChange)) * 0.6)
      .style("pointer-events", "none");

    node
      .append("text")
      .attr("class", "symbol-text")
      .text((d) => d.symbol.toUpperCase())
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("y", (d) => size(Math.abs(d.currentChange)) * 0.15)
      .attr("font-size", (d) => size(Math.abs(d.currentChange)) * 0.25)
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .style("pointer-events", "none");

    node
      .append("text")
      .attr("class", "percentage-text")
      .text((d) => {
        if (d.currentChange < 0) {
          return `${d.currentChange.toFixed(1)}%`;
        } else if (d.currentChange > 0) {
          return `+${d.currentChange.toFixed(1)}%`;
        } else {
          return "0%";
        }
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("y", (d) => size(Math.abs(d.currentChange)) * 0.45)
      .attr("font-size", (d) => size(Math.abs(d.currentChange)) * 0.2)
      .attr("fill", "white")
      .attr("font-weight", "normal")
      .style("pointer-events", "none");

    const simulation = d3
      .forceSimulation()
      .force(
        "x",
        d3
          .forceX()
          .strength(0.1)
          .x(width / 2)
      )
      .force(
        "y",
        d3
          .forceY()
          .strength(0.8)
          .y((d) => y(d.change))
      )
      .force(
        "center",
        d3
          .forceCenter()
          .x(width / 2)
          .y(height / 2)
      )
      .force("charge", d3.forceManyBody().strength(0.1))
      .force(
        "collide",
        d3
          .forceCollide()
          .strength(0.2)
          .radius((d) => size(Math.abs(d.currentChange)) + 3)
          .iterations(5)
      );

    let ticked = () => {
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    };

    simulation.nodes(data).on("tick", ticked);

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.03).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0.03);
      d.fx = null;
      d.fy = null;
    }
  };

  const handleTimeframeChange = (newTimeframe) => {
    if (newTimeframe === activeTimeframe || loading) return;

    setLoading(true);
    setActiveTimeframe(newTimeframe);

    startProgressBar();

    setTimeout(() => {
      if (coins.length > 0) {
        createBubbleChart(coins, newTimeframe);
      }
      setLoading(false);
    }, 100);
  };

  useEffect(() => {
    fetchData();
    startProgressBar();

    refreshIntervalRef.current = setInterval(() => {
      fetchData();
      startProgressBar();
    }, 60000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      d3.select("body").selectAll(".tooltip").remove();
    };
  }, []);

  useEffect(() => {
    if (coins.length > 0) {
      createBubbleChart(coins, activeTimeframe);
    }
  }, [coins]);

  useEffect(() => {
    const handleResize = () => {
      if (coins.length > 0 && !loading) {
        createBubbleChart(coins, activeTimeframe);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [coins, activeTimeframe, loading]);

  return (
    <div className="app-container">
      <div className="refresh-progress-bar">
        <div
          className="refresh-progress-fill"
          style={{ width: `${refreshProgress}%` }}
        ></div>
      </div>

      <div className="legend">
        <h3>Legend</h3>

        <div className="legend-section">
          <h4>Colors</h4>
          <div className="legend-item">
            <div
              className="color-circle"
              style={{ backgroundColor: "#00ff00" }}
            ></div>
            <span>Price Up</span>
          </div>
          <div className="legend-item">
            <div
              className="color-circle"
              style={{ backgroundColor: "#808080" }}
            ></div>
            <span>No Change</span>
          </div>
          <div className="legend-item">
            <div
              className="color-circle"
              style={{ backgroundColor: "#ff0000" }}
            ></div>
            <span>Price Down</span>
          </div>
        </div>

        <div className="legend-section">
          <h4>Interactions</h4>
          <div className="legend-text">
            <p>
              <strong>Hover:</strong> View detailed info
            </p>
            <p>
              <strong>Drag:</strong> Move bubbles around
            </p>
            <p>
              <strong>Position:</strong> Auto-grouped by performance
            </p>
            <p>
              <strong>Auto-refresh:</strong> every 60 s
            </p>
          </div>
        </div>

        <div className="legend-section">
          <h4>Layout</h4>
          <div className="legend-text">
            <p>
              <strong>Top:</strong> Gainers (green)
            </p>
            <p>
              <strong>Middle:</strong> Neutral (gray)
            </p>
            <p>
              <strong>Bottom:</strong> Losers (red)
            </p>
          </div>
        </div>
      </div>

      <div id="graph">
        <h1>Crypto Bubbles</h1>
        <svg ref={svgRef}></svg>
      </div>

      <div className="right-panel">
        <h3>Timeframes</h3>
        <div className="timeframe-controls">
          {Object.entries(timeframes).map(([key, config]) => (
            <button
              key={key}
              className={`timeframe-btn ${
                activeTimeframe === key ? "active" : ""
              }`}
              onClick={() => handleTimeframeChange(key)}
              disabled={loading}
            >
              {config.label}
            </button>
          ))}
        </div>
        {loading && (
          <div className="loading-indicator">Updating visualization...</div>
        )}
      </div>
    </div>
  );
}

export default App;
