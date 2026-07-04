import { Severity } from "../types";

export interface AICategorization {
  severity: Severity;
  department: string;
  suggestedLocation: string;
  summary: string;
  aiUsed: boolean;
}

export async function categorizeGrievance(description: string): Promise<AICategorization> {
  const response = await fetch("/api/gemini/categorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    throw new Error("Failed to auto-categorize using server-side analysis.");
  }

  return response.json();
}
