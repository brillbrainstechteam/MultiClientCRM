import { resolveReadiness, type ReadinessResult } from './domain/readiness';
import { useAgent, useKnowledgeSources, useSafetyPolicy, useTestCases } from './ai-agents-store';

/** Live readiness for one agent, reading from the session store (not the static fixtures). */
export function useAgentReadiness(agentId: string | undefined): ReadinessResult | undefined {
  const agent = useAgent(agentId);
  const sources = useKnowledgeSources(agentId);
  const safety = useSafetyPolicy(agentId);
  const testCases = useTestCases(agentId);
  if (!agent || !safety) return undefined;
  return resolveReadiness(agent, sources, safety, testCases);
}
