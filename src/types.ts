export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export const INTERESTS = [
  "History & Heritage",
  "Adventure & Outdoors",
  "Food & Culinary",
  "Art & Culture",
  "Nightlife",
  "Shopping",
  "Relaxation & Wellness",
  "Photography",
  "Nature & Wildlife",
  "Spiritual / Religious",
  "Off-the-beaten-path",
  "Architecture",
] as const;

export type Interest = (typeof INTERESTS)[number];

export interface TripProfile {
  destination?: string;
  duration?: string;
  dates?: string;
  budget?: string;
  currency?: string;
  travelers?: string;
  travelerType?: string;
  interests?: string[];
  accommodation?: string;
  dietary?: string;
  transport?: string;
  pace?: string;
  language?: string;
  accessibility?: string;
  departure?: string;
  passport?: string;
}

export interface StoredUser {
  id: number;
  username: string;
  role: "admin" | "user";
  active: boolean;
  createdAt: string;
}

export interface AppSettings {
  /** Whether the server has an API key configured (the key itself is never sent to the browser) */
  apiKeyConfigured: boolean;
  model: string;
  provider: "openai" | "openrouter" | "deepseek" | "gemini";
  appName: string;
  allowReg: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKeyConfigured: false,
  model: "gpt-4o",
  provider: "openai",
  appName: "TravelMind",
  allowReg: true,
};
