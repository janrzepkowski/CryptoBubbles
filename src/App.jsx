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

  const createBubbleChart = (data) => {
    d3.select(svgRef.current).selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("border-radius", "5px");

    // Process data and add change categories
    data.map((el) => {
      if (Math.abs(el.price_change_percentage_24h) > 100) {
        el.price_change_percentage_24h = 0;
      }
    });

    data.map((el) => {
      if (Math.abs(el.price_change_percentage_24h) > 100) {
        el["change"] = "crazy";
      } else if (
        el.price_change_percentage_24h > 0 &&
        el.price_change_percentage_24h < 100
      ) {
        el["change"] = "up";
      } else if (el.price_change_percentage_24h < 0) {
        el["change"] = "down";
      } else if (
        el.price_change_percentage_24h === 0 ||
        el.price_change_percentage_24h === null
      ) {
        el["change"] = "zero";
        if (el.price_change_percentage_24h === null) {
          el.price_change_percentage_24h = 0;
        }
      }
    });

    // Format market cap and volume
    data.map((el) => {
      if (el.market_cap > 1000000000) {
        el["toolMC"] = `$${(el.market_cap / 1000000000).toFixed(2)}B`;
      } else {
        el["toolMC"] = `$${(el.market_cap / 1000000).toFixed(2)}M`;
      }
    });

    data.map((el) => {
      if (el.total_volume > 1000000000) {
        el["toolTV"] = `$${(el.total_volume / 1000000000).toFixed(2)}B`;
      } else {
        el["toolTV"] = `$${(el.total_volume / 1000000).toFixed(2)}M`;
      }
    });

    data.map((el) => {
      if (el.price_change_percentage_24h > 1) {
        el["toolPC"] = `+${el.price_change_percentage_24h.toFixed(2)}%`;
      } else {
        el["toolPC"] = `${el.price_change_percentage_24h.toFixed(2)}%`;
      }
    });

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    });

    // Find max change for scaling
    function max() {
      let maxChange = 0;
      data.forEach((coin) => {
        if (Math.abs(coin.price_change_percentage_24h) > maxChange) {
          maxChange = Math.abs(coin.price_change_percentage_24h);
        }
      });
      return maxChange;
    }

    // Color scale - gradient based on percentage change
    const colorScale = d3
      .scaleLinear()
      .domain([-max(), 0, max()])
      .range(["#ff0000", "#808080", "#00ff00"])
      .clamp(true);

    // Size scale
    const size = d3
      .scaleLinear()
      .domain([0, (max() * 2.5) / 15, max()])
      .range([15, 40, 60]);

    // Y position for up/down coins
    const y = d3
      .scaleOrdinal()
      .domain(["up", "down", "zero"])
      .range([150, 350, 250]);

    // Tooltip
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
      const tooltipWidth = 300;
      const tooltipHeight = 200;
      const margin = 20;

      // pozycja tooltipa
      let tooltipX = event.pageX + 20;
      let tooltipY = event.pageY - 30;

      // czy wychodzi poza prawą krawędź
      if (tooltipX + tooltipWidth > window.innerWidth) {
        tooltipX = event.pageX - tooltipWidth - 20;
      }

      // czy wychodzi poza dolną krawędź
      if (tooltipY + tooltipHeight > window.innerHeight) {
        tooltipY = event.pageY - tooltipHeight - 20;
      }

      // czy wychodzi poza górną krawędź
      if (tooltipY < margin) {
        tooltipY = margin;
      }

      // czy wychodzi poza lewą krawędź
      if (tooltipX < margin) {
        tooltipX = margin;
      }

      tooltip
        .html(
          `Name: <strong>${d.name}</strong><br/>` +
            `Symbol: <strong>${d.symbol.toUpperCase()}</strong><br/>` +
            `Current Price: <strong>${formatter.format(
              d.current_price
            )}</strong><br/>` +
            `24Hr Change: <strong>${d.toolPC}</strong><br/>` +
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
        .style("border-color", colorScale(d.price_change_percentage_24h));
    };

    const mouseleave = function (event, d) {
      tooltip.style("opacity", 0);
    };

    // Create groups for bubbles
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

    // Add circles as backgrounds
    node
      .append("circle")
      .attr("r", (d) => size(Math.abs(d.price_change_percentage_24h)))
      .style("fill", (d) => colorScale(d.price_change_percentage_24h))
      .style("fill-opacity", 0.8)
      .attr("stroke", (d) => colorScale(d.price_change_percentage_24h))
      .style("stroke-width", 2);

    // Add logos
    node
      .append("image")
      .attr("xlink:href", (d) => d.image)
      .attr("x", (d) => -size(Math.abs(d.price_change_percentage_24h)) * 0.3)
      .attr("y", (d) => -size(Math.abs(d.price_change_percentage_24h)) * 0.5)
      .attr("width", (d) => size(Math.abs(d.price_change_percentage_24h)) * 0.6)
      .attr(
        "height",
        (d) => size(Math.abs(d.price_change_percentage_24h)) * 0.6
      )
      .style("pointer-events", "none");

    // Add symbol text
    node
      .append("text")
      .attr("class", "symbol-text")
      .text((d) => d.symbol.toUpperCase())
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("y", (d) => size(Math.abs(d.price_change_percentage_24h)) * 0.15)
      .attr(
        "font-size",
        (d) => size(Math.abs(d.price_change_percentage_24h)) * 0.25
      )
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .style("pointer-events", "none");

    // Add percentage change text
    node
      .append("text")
      .attr("class", "percentage-text")
      .text((d) => {
        if (d.price_change_percentage_24h < 0) {
          return `${d.price_change_percentage_24h.toFixed(1)}%`;
        } else if (d.price_change_percentage_24h > 0) {
          return `+${d.price_change_percentage_24h.toFixed(1)}%`;
        } else {
          return "0%";
        }
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("y", (d) => size(Math.abs(d.price_change_percentage_24h)) * 0.45)
      .attr(
        "font-size",
        (d) => size(Math.abs(d.price_change_percentage_24h)) * 0.2
      )
      .attr("fill", "white")
      .attr("font-weight", "normal")
      .style("pointer-events", "none");

    // Simulation forces
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
          .radius((d) => size(Math.abs(d.price_change_percentage_24h)) + 3)
          .iterations(5)
      );

    // Tick function
    let ticked = () => {
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    };

    simulation.nodes(data).on("tick", ticked);

    // Drag functions
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
      d3.select("body").selectAll(".tooltip").remove();
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
    <div id="graph">
      <h1>Crypto Bubbles</h1>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default App;
