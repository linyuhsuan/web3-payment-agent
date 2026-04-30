# PRD — Web3 AI Payment Agent
## ETHGlobal OpenAgents 黑客松參賽項目

**Version:** 1.2
**Date:** 2026-04-26
**Status:** Ready for Implementation
**Changelog:**
- v1.2 — 加入 Uniswap swap 場景；移除技術實作細節至 System Design 文件
- v1.1 — 新增 LLM 自然語言理解層
- v1.0 — 初版

---

## 1. 產品概述

### 1.1 Product Vision

讓任何人可以用自然語言完成 Web3 支付，無需理解鏈的概念、Gas 費用或地址格式。

> 「就像你傳訊息給朋友一樣，AI 幫你做完所有鏈上操作。」

### 1.2 Problem Statement

| 痛點 | 現況 |
|------|------|
| 使用者需要知道對方的 0x 地址 | ENS 存在但使用者要自己查 |
| 使用者不知道哪條鏈最便宜 | 需要手動查詢多個橋/工具 |
| Gas 費用難以預測 | 每條鏈的計算方式不同 |
| 持有錯誤 token 無法直接付款 | 需要手動 swap 再 transfer |
| 操作步驟複雜 | 需要切鏈、approve、transfer 多步 |

### 1.3 Solution

一個 **Tool-using AI Agent**，接受自然語言指令，自動：
1. 解析收款人身份（ENS / 0x address）
2. 掃描用戶多鏈 USDT 餘額
3. 若有足夠 USDT → 選出「有餘額 ∩ Gas 最低」的鏈直接轉帳
4. 若無足夠 USDT → 用 Uniswap 將用戶的 ETH swap 成 USDT，再轉帳
5. 估算完整費用（gas + swap cost）
6. 建構交易並請用戶用 MetaMask 確認

### 1.4 Hackathon Scope

- **Token:** USDT（目標）；ETH → USDT swap（Uniswap）
- **Chains:** Ethereum, Arbitrum, Optimism, Base, Polygon
- **Execution Modes:** Demo Mode（模擬）/ Real Mode（測試網）
- **Wallet:** MetaMask via wagmi（Human-in-the-loop signing）

---

## 2. 用戶故事

### 2.1 主要場景：直接轉帳

```
作為一個 Web3 用戶，
我希望輸入 "send 50 USDT to alice.eth"，
讓 AI 自動找到最佳鏈並完成轉帳，
不需要我手動查地址或切換網路。
```

**Happy Path（有 USDT）：**
1. 用戶連接 MetaMask
2. 輸入指令：`send 50 USDT to alice.eth`
3. AI 並行執行 ENS 解析 + 多鏈餘額查詢
4. AI 選出最佳鏈（有餘額 + Gas 最低）
5. 顯示決策結果卡片（地址 / 鏈 / Gas / 預估時間）
6. 用戶點擊「Execute」
7. MetaMask 彈出確認視窗
8. 用戶 sign → 廣播 → 顯示成功

---

### 2.2 新場景：Swap 後轉帳（Uniswap）

```
作為一個持有 ETH 但沒有 USDT 的用戶，
我希望輸入 "send 50 USDT to alice.eth"，
讓 AI 自動將我的 ETH 換成 USDT 再完成轉帳，
不需要我手動去 Uniswap 操作。
```

**Happy Path（無 USDT，有 ETH）：**
1. 用戶連接 MetaMask
2. 輸入指令：`send 50 USDT to alice.eth`
3. AI 查詢後發現用戶無足夠 USDT，但 Arbitrum 有 ETH
4. AI 向 Uniswap 取得 ETH → USDT 報價
5. 顯示 Swap 決策卡片（需要 swap X ETH → 50 USDT，swap cost + gas）
6. 用戶確認 → MetaMask 彈出 **2 筆確認**：
   - Tx 1: Swap（ETH → USDT，via Uniswap）
   - Tx 2: Transfer USDT to alice.eth
   （Native ETH 不需額外 approve tx）
7. 顯示成功 + 兩筆 tx hash

---

## 3. 功能需求（高層次）

### 核心支付流程
- **FR-01** 用戶可透過 MetaMask / WalletConnect 連接錢包
- **FR-02** 用戶可用任意自然語言（中/英/混合）發起付款指令
- **FR-03** AI 自動解析 ENS 名稱為 0x 地址
- **FR-04** AI 並行查詢 5 條鏈上的 USDT 餘額
- **FR-05** AI 自動選出「有足夠餘額 ∩ Gas 最低 ∩ 有 ETH for gas」的最佳鏈
- **FR-06** AI 估算完整 Gas 費用（含 L2 的 L1 data fee）
- **FR-07** AI 建構交易，交由 MetaMask 簽名（不持有私鑰）

### Uniswap 整合
- **FR-08** 若所有鏈 USDT 不足，AI 檢查是否有 ETH 可 swap
- **FR-09** AI 向 Uniswap API 取得 ETH → USDT 最佳報價
- **FR-10** 顯示 Swap 決策卡片，包含 swap cost + gas 總費用
- **FR-11** Swap 流程需 2 筆 MetaMask 確認（swap + transfer）
           （ETH 為 native token，不需額外 approve tx）
- **FR-12** Swap 完成後自動接續 transfer 流程

### 執行與顯示
- **FR-13** Demo Mode：展示完整決策，不廣播交易
- **FR-14** Real Mode：MetaMask 確認後廣播至測試網
- **FR-15** 即時顯示每個 AI 決策步驟（streaming 可視化）
- **FR-16** 廣播後顯示 tx hash 與 block explorer 連結

### 錯誤處理
- **FR-17** ENS 不存在 → 顯示友善錯誤，提示重新輸入
- **FR-18** 所有鏈 USDT 不足且無 ETH 可 swap → 顯示明細告知用戶
- **FR-19** 單一鏈 RPC 逾時 → 跳過該鏈，繼續其他鏈
- **FR-20** MetaMask 拒絕 → 不清除流程，允許重試

---

## 4. 非功能性需求

| 指標 | 目標 |
|------|------|
| 完整流程時間（Happy Path）| < 10s（含 swap 場景）|
| 完整流程時間（直接轉帳）| < 8s |
| Anthropic / Alchemy API Key | 只存後端，不進前端 bundle |
| 私鑰安全 | AI 不持有、不儲存用戶私鑰 |
| Human-in-the-loop | 每筆交易都需要 MetaMask 人工確認 |
| 前端 bundle 大小 | < 500KB |
| 部分鏈失敗容錯 | 1–4 條鏈 RPC 失敗仍可繼續 |

---

## 5. UI/UX 規格

### 5.1 主流程畫面

```
[1] Connect Wallet
       ↓
[2] Input: "send 50 USDT to alice.eth"
       ↓
[3] Agent Steps（串流可視化）
    ✅ Resolved: alice.eth → 0xABC...123
    ✅ Balances: ARB:0 | ETH:0 | BASE:0 | POLY:0
    ⚠️ No USDT found. Checking ETH balance...
    ✅ ETH on Arbitrum: 0.05 ETH
    ✅ Swap quote: 0.025 ETH → 50 USDT (Uniswap)
    ✅ Gas estimated: $0.08
       ↓
[4] Swap Decision Card
    ┌────────────────────────────────┐
    │ No USDT found.                 │
    │ Swap 0.025 ETH → 50 USDT      │
    │ via Uniswap on Arbitrum        │
    │                                │
    │ Swap cost:  ~$0.05             │
    │ Gas:        ~$0.08             │
    │ Total cost: ~$0.13             │
    │ Time:       ~10 sec            │
    │                                │
    │ Requires 3 MetaMask approvals  │
    │ [Demo Mode] [Proceed →]        │
    └────────────────────────────────┘
       ↓ (3 MetaMask confirmations)
[5] Result
    ✅ Swap complete: 0xTX1...
    ✅ Transfer complete: 0xTX3...
    [View on Arbiscan]
```

### 5.2 Agent Steps 顯示規格

- 每個 step：icon（⏳→✅→⚠️→❌）+ 名稱 + 結果摘要
- Streaming 效果：步驟逐一出現
- Swap 場景額外顯示：報價來源（Uniswap）、需要幾筆確認

### 5.3 錯誤顯示規格

| 錯誤類型 | 呈現方式 |
|---------|---------|
| 用戶錯誤（餘額不足、ENS 不存在）| Inline 顯示，friendly message |
| 系統錯誤（RPC timeout、API error）| Toast notification + retry |
| MetaMask 拒絕 | 不清除流程，顯示 retry button |

---

## 6. 驗收標準

### 6.1 直接轉帳流程
- [ ] 輸入 `send 1 USDT to vitalik.eth` → 成功解析 vitalik.eth
- [ ] 多鏈餘額查詢顯示各鏈正確 USDT 數量
- [ ] selectChain 選出有足夠餘額且 gas 最低的鏈
- [ ] Demo mode：顯示決策結果，不廣播
- [ ] Real mode：MetaMask 彈出 → 成功廣播到測試網

### 6.2 Uniswap Swap 流程
- [ ] USDT 餘額為 0，有 ETH → AI 自動進入 swap 流程
- [ ] 顯示 Uniswap 報價（需要多少 ETH）
- [ ] 顯示 swap cost + gas 總費用
- [ ] MetaMask 依序彈出 swap → transfer 共 2 筆（ETH 不需 approve）
- [ ] 全部完成後顯示 2 筆 tx hash

### 6.3 邊界情況
- [ ] ENS 不存在 → 顯示 friendly error
- [ ] 無 USDT 且無足夠 ETH → 顯示各鏈餘額明細
- [ ] MetaMask 在 swap 中途拒絕 → 不清除流程，可重試
- [ ] 一條鏈 RPC timeout → 跳過，繼續其他鏈

### 6.4 安全
- [ ] Anthropic API Key 不出現在前端 bundle
- [ ] 不儲存用戶私鑰
- [ ] 每筆交易都需要 MetaMask 人工確認

---

## 7. 黑客松評審重點

| 評分維度 | 對應設計 |
|----------|----------|
| AI Agent 真實性 | Claude tool use + streaming reasoning trace |
| Web3 整合深度 | 5 chains, ENS, Uniswap swap, real gas estimation |
| UX 創新 | 自然語言 → AI 決策 → MetaMask（含 swap 路徑）|
| 完整性 | Edge case handling, error recovery |
| Demo 效果 | Streaming steps, decision card, demo/real mode |

### 贊助商獎項資格

| 贊助商 | 獎金 | 資格狀態 |
|--------|------|---------|
| **ENS** | $5,000 | ✅ 已整合（ENS 作為 AI agent 身份解析）|
| **Uniswap** | $5,000 | ✅ 已整合（ETH → USDT swap）需附 FEEDBACK.md |

---

*技術實作細節（API 規格、工具定義、時程）請參閱 [web3-ai-agent-system-design.md](./web3-ai-agent-system-design.md)*
