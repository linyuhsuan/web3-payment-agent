import type { AgentStep } from "../hooks/useAgentStream";

interface AgentStepsProps {
  steps: AgentStep[];
  claudeText?: string;
}

const dotClass: Record<AgentStep["status"], string> = {
  running: "bg-amber-500 animate-pulse",
  done: "bg-emerald-500",
  error: "bg-red-500",
};

export function AgentSteps({ steps, claudeText }: AgentStepsProps) {
  if (steps.length === 0 && !claudeText) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Agent Steps</h2>
      {steps.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3">
              <span
                className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotClass[step.status]}`}
                aria-hidden
              />
              <div>
                <p className="m-0 text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="m-0 mt-0.5 text-sm text-gray-500">{step.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {claudeText && (
        <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-700 whitespace-pre-wrap">
          {claudeText}
        </p>
      )}
    </div>
  );
}
