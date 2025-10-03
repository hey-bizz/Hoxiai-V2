import { tool } from 'ai'
import { experimental_createMCPClient } from 'ai'
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'
import { z } from 'zod'

const inputSchema = z.object({
  websiteId: z.string().describe('Target website identifier'),
  limit: z.number().int().positive().max(50).optional().default(5),
  sinceHours: z.number().int().positive().max(720).optional().default(168)
})

export type SupabaseMcpInput = z.infer<typeof inputSchema>

export type SupabaseMcpResponse =
  | { success: true; data: unknown }
  | { success: false; error: string }

export const supabaseMcpTool = tool({
  description: 'Fetches latest bot detection rows and cost summaries for a website using the Supabase MCP bridge.',
  inputSchema,
  execute: async ({ websiteId, limit = 5, sinceHours = 168 }: SupabaseMcpInput): Promise<SupabaseMcpResponse> => {
    const transport = new Experimental_StdioMCPTransport({
      command: 'node',
      args: ['scripts/mcp/supabase-server.mjs'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development'
      }
    })

    const client = await experimental_createMCPClient({ transport })

    try {
      const tools = await client.tools()
      const fetchTool = tools['fetch-latest-analysis']

      if (!fetchTool) {
        throw new Error('Supabase MCP server missing fetch-latest-analysis tool')
      }

      const result = await fetchTool.execute({ websiteId, limit, sinceHours })
      const content = result?.content?.[0]

      if (!content) {
        return {
          success: false,
          error: 'No content returned from Supabase MCP tool.'
        }
      }

      if (content.type === 'json') {
        return {
          success: true,
          data: content.json
        }
      }

      if (content.type === 'text') {
        try {
          const parsed = JSON.parse(content.text)
          return {
            success: true,
            data: parsed
          }
        } catch {
          return {
            success: true,
            data: { raw: content.text }
          }
        }
      }

      return {
        success: true,
        data: content
      }
    } finally {
      await client.close()
    }
  }
})
