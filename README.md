# PayAgent — Web3 AI Payment Agent

> Pay anyone across chains. Just chat. AI handles the rest.

PayAgent is an intent-based AI agent for multi-chain Web3 payments. Describe what you want in plain English — the agent resolves ENS names, scans balances across 5 chains, picks the cheapest route, and auto-swaps via Uniswap if needed. You only sign in your wallet.

Built for **ETHGlobal OpenAgents Hackathon**.

---

## Demo

| Direct Transfer | ETH → USDT Swap |
|---|---|
| Type `send 50 USDT to alice.eth` | Type `send 50 USDT to alice.eth` (no USDT in wallet) |
| AI resolves ENS, picks cheapest chain, builds tx | AI detects no USDT, fetches Uniswap quote, builds swap + transfer |
| 1 wallet confirmation | 2 wallet confirmations |

---

## Features

- **Natural language intent** — No chain selection, no address lookup, no gas math
- **ENS resolution** — Send to `alice.eth` directly, no `0x` address needed
- **Multi-chain parallel scanning** — Balances queried across 5 chains simultaneously; routes to lowest gas
- **Auto-swap via Uniswap** — No USDT? Agent swaps your ETH automatically (EXACT_OUTPUT mode)
- **4 payment paths** — Direct USDT, Direct ETH, ETH→USDT swap, USDT→ETH swap
- **Live AI reasoning** — Each agent step streams to the UI in real time via SSE
- **Human-in-the-loop** — Backend builds unsigned calldata only; your wallet signs every transaction

## Supported Chains

Ethereum · Arbitrum · Optimism · Base · Polygon

---

## Architecture

```mermaid
flowchart TD
    User(["User\n(Browser)"])

    subgraph FE["Frontend"]
        UI["React UI\nAgentSteps · DecisionCard · SwapDecisionCard"]
        Wallet["wagmi v2 + ConnectKit\nwallet signing"]
    end

    subgraph BE["Backend (Node.js)"]
        Agent["AI Agent\nGemini function-calling loop"]
        subgraph Tools["7 Tools"]
            T1["resolveIdentity\n(ENS → 0x)"]
            T2["getBalances\n(5 chains parallel)"]
            T3["selectChain\n(lowest gas routing)"]
            T4["estimateGas\n(incl. L2 L1 data fee)"]
            T5["createTransaction\n(unsigned ERC-20 calldata)"]
            T6["getSwapQuote ✦"]
            T7["buildSwapTx ✦"]
        end
    end

    Alchemy["Alchemy RPC\nETH · ARB · OP · BASE · POL"]
    Uniswap["Uniswap Trading API\nswap quotes + routes"]
    Chain["Blockchain"]

    User -->|"natural language intent"| UI
    UI -->|"POST /api/agent (SSE)"| Agent
    Agent -->|"SSE: tool events + decision"| UI
    Agent <--> Tools
    T1 & T2 & T3 & T4 & T5 --> Alchemy
    T6 & T7 -->|"✦ Uniswap"| Uniswap
    UI -->|"unsigned tx"| Wallet
    Wallet -->|"signed tx"| Chain
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Wallet | wagmi v2 + ConnectKit |
| AI Agent | Gemini 2.5 Flash (function calling) |
| Multi-chain RPC | viem + Alchemy |
| Swap | Uniswap Trading API |
| Identity | ENS (via Alchemy) |
| Backend | Node.js + Express + TypeScript |
| Streaming | Server-Sent Events (SSE) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A wallet browser extension (MetaMask or similar)

---

## How It Works

1. **State your intent** — Type `send 50 USDT to vitalik.eth` in the chat
2. **Agent reasons** — AI resolves ENS, scans all chains in parallel, picks cheapest route, quotes swap if needed
3. **You confirm** — Review the decision card, then sign in your wallet

The agent core is a function-calling loop where the AI model decides at runtime which tools to invoke and in what order — the tool sequence is never fixed. It adapts to what the intent actually requires:

| Intent | Tool path |
|---|---|
| `send 50 USDT to alice.eth` (has USDT) | `resolveIdentity → getBalances → selectChain → estimateGas → createTransaction` |
| `send 50 USDT to alice.eth` (no USDT) | `resolveIdentity → getBalances → getSwapQuote → buildSwapTx` |
| `send 0.01 ETH to alice.eth` | `resolveIdentity → getBalances → selectChain → estimateGas → createTransaction` |

For example, when no USDT is available the model skips `selectChain`, `estimateGas`, and `createTransaction` entirely and routes through the swap tools instead. Tools like `getSwapQuote` and `buildSwapTx` are only called when actually needed.

Every tool call emits an SSE event so the frontend renders each reasoning step live.

---

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agent` | Run agent, returns SSE stream |
| `GET` | `/api/balances?address=0x...` | Query balances across all chains |
| `DELETE` | `/api/session/:address` | Clear conversation session |

---

## Security

- API keys (`GEMINI_API_KEY`, `ALCHEMY_API_KEY`, `UNISWAP_API_KEY`) are backend-only and never exposed to the client
- The backend builds unsigned transaction calldata only — it never holds private keys
- Every transaction requires explicit wallet confirmation (human-in-the-loop)
- `walletAddress` inputs are validated with `isAddress` before any processing

---

## License

MIT
