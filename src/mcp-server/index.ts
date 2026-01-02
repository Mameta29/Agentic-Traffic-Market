/**
 * MCP (Model Context Protocol) Server
 * AIエージェントの全ツールを統合管理
 */

import * as getJpycBalance from './tools/get-jpyc-balance';
import * as transferJpyc from './tools/transfer-jpyc';
import * as signTrafficIntent from './tools/sign-traffic-intent';
import * as evaluateCongestion from './tools/evaluate-congestion';
import * as negotiateMessage from './tools/negotiate-message';

/**
 * 全MCPツールの定義
 */
export const mcpTools = {
  [getJpycBalance.toolName]: {
    description: getJpycBalance.toolDescription,
    inputSchema: getJpycBalance.inputSchema,
    execute: getJpycBalance.execute,
  },
  [transferJpyc.toolName]: {
    description: transferJpyc.toolDescription,
    inputSchema: transferJpyc.inputSchema,
    execute: transferJpyc.execute,
  },
  [signTrafficIntent.toolName]: {
    description: signTrafficIntent.toolDescription,
    inputSchema: signTrafficIntent.inputSchema,
    execute: signTrafficIntent.execute,
  },
  [evaluateCongestion.toolName]: {
    description: evaluateCongestion.toolDescription,
    inputSchema: evaluateCongestion.inputSchema,
    execute: evaluateCongestion.execute,
  },
  [negotiateMessage.toolName]: {
    description: negotiateMessage.toolDescription,
    inputSchema: negotiateMessage.inputSchema,
    execute: negotiateMessage.execute,
  },
} as const;

/**
 * ツール名の型
 */
export type ToolName = keyof typeof mcpTools;

/**
 * Vercel AI SDK用のツール定義変換
 * streamTextで使用できる形式に変換
 */
export function getVercelAITools() {
  const tools: Record<string, any> = {};

  for (const [name, tool] of Object.entries(mcpTools)) {
    tools[name] = {
      description: tool.description,
      parameters: tool.inputSchema,
      execute: async (args: any) => {
        console.log(`[MCP] Executing tool: ${name}`, args);
        const result = await tool.execute(args);
        console.log(`[MCP] Tool result:`, result);
        return result;
      },
    };
  }

  return tools;
}

/**
 * ツールリストを取得（デバッグ用）
 */
export function listTools(): string[] {
  return Object.keys(mcpTools);
}

