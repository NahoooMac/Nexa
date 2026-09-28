import type { EngineInput, FinancialAnalytics } from './aiEngine';

export type AIRequestMode = 'quick' | 'deep';

export interface NexaAIContext {
  finance: FinancialAnalytics;
  tasks: EngineInput['tasks'];
  goals: EngineInput['goals'];
  workouts: EngineInput['workouts'];
  courses: EngineInput['courses'];
  reminders: EngineInput['reminders'];
  streak: number;
}

export async function askNexaAI(
  question: string,
  data: NexaAIContext,
  mode: AIRequestMode = 'deep',
): Promise<{ text: string; model: string }> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, mode, data }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Nexa AI is unavailable right now.');
  return result;
}
