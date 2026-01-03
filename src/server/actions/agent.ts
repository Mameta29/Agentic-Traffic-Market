import 'server-only';

import { streamText, type CoreMessage } from 'ai';
import { google, GEMINI_MODEL, AGENT_SYSTEM_PROMPTS, type AgentRole } from '../lib/vertex-ai';
import { getVercelAITools } from '../../mcp-server';

/**
 * エージェントのAI思考プロセスをストリーミング
 * 
 * @param role エージェントの役割（buyer/seller）
 * @param messages チャット履歴
 * @param agentAddress エージェントのEthereumアドレス
 */
export async function streamAgentThinking(
  role: AgentRole,
  messages: CoreMessage[],
  agentAddress: string
) {
  console.log(`[Agent AI] Starting stream for ${role} agent (${agentAddress})`);

  try {
    // MCPツールを取得
    const tools = getVercelAITools();

    // システムプロンプトを追加
    const systemPrompt = AGENT_SYSTEM_PROMPTS[role];

    // Vertex AI (Gemini 3) でストリーミング開始
    const result = streamText({
      model: google(GEMINI_MODEL),
      system: systemPrompt,
      messages,
      tools,
      maxSteps: 10, // 最大ツール呼び出し回数
      temperature: 1.0, // Gemini 3推奨: デフォルトの1.0を使用
      // Gemini 3の新機能: thinking_level
      // 'high' (default): 深い推論、'low': 低レイテンシ
      experimental_telemetry: {
        isEnabled: true,
      },
      onStepFinish: (step) => {
        console.log(`[Agent AI] Step finished:`, {
          stepType: step.stepType,
          text: step.text?.substring(0, 100),
          toolCalls: step.toolCalls?.length || 0,
          toolResults: step.toolResults?.length || 0,
        });
      },
    });

    return result;
  } catch (error) {
    console.error('[Agent AI] Error in streamAgentThinking:', error);
    throw error;
  }
}

/**
 * シンプルなエージェント実行（非ストリーミング）
 * テスト用
 */
export async function executeAgentAction(
  role: AgentRole,
  prompt: string,
  agentAddress: string
) {
  const messages: CoreMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  const stream = await streamAgentThinking(role, messages, agentAddress);

  // ストリームを完全に読み取る
  let fullText = '';
  for await (const chunk of stream.textStream) {
    fullText += chunk;
  }

  return fullText;
}

