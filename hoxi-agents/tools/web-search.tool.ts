import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import dotenv from 'dotenv';
// Load .env.local first (project convention), then fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

// Exa client
export const exa = new Exa(process.env.EXA_API_KEY);

// Primary: Exa search by query (for Sherlock)
export const webSearch = tool({
  description: 'Search the web (via Exa) for information about user agents, bots, crawlers, or vendors.',
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe('Search query (e.g., "GPTBot user agent documentation")'),
    limit: z.number().min(1).max(10).default(3).describe('Number of results to return'),
  }),
  execute: async ({ query, limit }) => {
    const { results } = await exa.searchAndContents(query, {
      livecrawl: 'always',
      numResults: limit,
    });
    return (results || []).slice(0, limit).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: (r.text || '').slice(0, 1200),
      publishedDate: r.publishedDate,
    }));
  },
});

// (Optional) A crawl tool can be added later if needed.
