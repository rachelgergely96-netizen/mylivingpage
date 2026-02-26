import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | undefined;

export function getAnthropicClient() {
  if (anthropicClient) {
    return anthropicClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}
