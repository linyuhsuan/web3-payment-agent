import { AgentSteps } from "../agent/AgentSteps";
import { DecisionCard } from "../transaction/DecisionCard";
import { SwapDecisionCard } from "../transaction/SwapDecisionCard";
import type { AgentDecision, AgentStep, AgentSwapDecision } from "../../hooks/useAgentStream";

interface TurnMessageProps {
  userText: string;
  steps: AgentStep[];
  agentText: string;
  decision: AgentDecision | null;
  swapDecision: AgentSwapDecision | null;
  error: string | null;
  isStreaming: boolean;
}

export function TurnMessage({
  userText,
  steps,
  agentText,
  decision,
  swapDecision,
  error,
  isStreaming,
}: TurnMessageProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-gray-800 px-4 py-3 text-sm text-gray-200">
          {userText}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isStreaming && steps.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
            Agent is thinking…
          </div>
        )}

        {(steps.length > 0 || agentText) && (
          <AgentSteps steps={steps} geminiText={agentText} />
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {decision && <DecisionCard decision={decision} />}
        {swapDecision && <SwapDecisionCard decision={swapDecision} />}
      </div>
    </div>
  );
}
