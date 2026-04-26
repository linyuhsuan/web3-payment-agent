import { useState, useCallback } from "react";
import { useConnection } from "wagmi";
import { WalletConnect } from "./components/WalletConnect";
import { ChatInput } from "./components/ChatInput";
import { BalanceDisplay } from "./components/BalanceDisplay";
import "./App.css";

function App() {
  const { address } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const handleSubmit = useCallback(async (message: string, walletAddress: string) => {
    setIsLoading(true);
    setLog((prev) => [...prev, `> ${message}`]);
    // Placeholder — wired up Day 3 when /api/agent SSE is ready
    setLog((prev) => [...prev, `[wallet] ${walletAddress}`]);
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Web3 AI Payment Agent</h1>
        <WalletConnect />
      </header>
      <main className="app-main">
        {address && <BalanceDisplay address={address} />}
        <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
        {log.length > 0 && (
          <pre className="debug-log">{log.join("\n")}</pre>
        )}
      </main>
    </div>
  );
}

export default App;
