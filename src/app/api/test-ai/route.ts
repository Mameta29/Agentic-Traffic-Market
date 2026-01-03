import { streamText } from 'ai';
import { google, GEMINI_MODEL } from '@/server/lib/vertex-ai';

/**
 * Google AI 接続テスト用API
 * GET /api/test-ai
 */
export async function GET() {
  try {
    console.log('[Test AI] Testing Google AI connection...');
    console.log('[Test AI] Model:', GEMINI_MODEL);

    const result = await streamText({
      model: google(GEMINI_MODEL),
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Gemini!" and nothing else.',
        },
      ],
      temperature: 0,
      maxTokens: 50,
    });

    let fullResponse = '';
    for await (const chunk of result.textStream) {
      fullResponse += chunk;
    }

    console.log('[Test AI] Response:', fullResponse);

    return Response.json({
      success: true,
      model: GEMINI_MODEL,
      response: fullResponse,
      message: 'Google AI is working correctly',
    });
  } catch (error) {
    console.error('[Test AI] Error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

