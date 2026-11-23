import { afterEach, expect, it, vi } from 'vitest';
import { createGateway, generateText, jsonSchema, Output } from 'ai';

afterEach(() => vi.restoreAllMocks());

it('executa createGateway + generateText + Output.object do AI SDK sem rede externa', async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  const gateway = createGateway({
    apiKey: 'synthetic-gateway-key',
    fetch: async (input, init) => {
      requests.push({ url: String(input), init });
      return Response.json({
        content: [{ type: 'text', text: '{"ok":"resultado sintético"}' }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
      });
    },
  });

  const result = await generateText({
    model: gateway('moonshotai/kimi-k2.5'),
    output: Output.object({
      schema: jsonSchema<{ ok: string }>({
        type: 'object',
        additionalProperties: false,
        properties: { ok: { type: 'string' } },
        required: ['ok'],
      }),
    }),
    prompt: 'Entrada sintética.',
    maxOutputTokens: 32,
    providerOptions: { gateway: { only: ['bedrock'], zeroDataRetention: true } },
    abortSignal: AbortSignal.timeout(1000),
  });

  expect(result.output).toEqual({ ok: 'resultado sintético' });
  expect(result.steps[0].finishReason).toBe('stop');
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe('https://ai-gateway.vercel.sh/v4/ai/language-model');
  const headers = new Headers(requests[0].init?.headers);
  expect(headers.get('authorization')).toBe('Bearer synthetic-gateway-key');
  expect(headers.get('ai-language-model-id')).toBe('moonshotai/kimi-k2.5');
  const body = JSON.parse(String(requests[0].init?.body));
  expect(body).toMatchObject({
    maxOutputTokens: 32,
    providerOptions: { gateway: { only: ['bedrock'], zeroDataRetention: true } },
  });
  expect(JSON.stringify(body)).not.toContain('synthetic-gateway-key');
});
