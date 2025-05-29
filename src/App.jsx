import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [coins, setCoins] = useState([]);

  const api_key = import.meta.env.VITE_API_COINGECKO_KEY;

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": api_key,
    },
  };

  useEffect(() => {
    axios
      .get(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h,24h,7d",
        options
      )
      .then((res) => {
        setCoins(res.data);
      });
  }, []);

  return (
    <>
      <h1>Crypto Bubbles</h1>
      <div className="crypto-grid">
        {coins.map((coin) => (
          <div key={coin.id} className="crypto-card">
            <div className="crypto-header">
              <img src={coin.image} alt={coin.name} className="crypto-icon" />
              <div>
                <h3>{coin.name}</h3>
                <span className="symbol">{coin.symbol.toUpperCase()}</span>
              </div>
            </div>

            <div className="crypto-data">
              <div className="price">
                ${coin.current_price?.toLocaleString()}
              </div>

              <div className="market-cap">
                Market Cap: ${(coin.market_cap / 1e9).toFixed(2)}B
              </div>

              <div className="changes">
                <div
                  className={`change ${
                    coin.price_change_percentage_24h >= 0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  24h: {coin.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
