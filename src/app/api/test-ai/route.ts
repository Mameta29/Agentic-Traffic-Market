import { generateText, streamText } from 'ai';
import { google, GEMINI_MODEL } from '@/server/lib/vertex-ai';

/**
 * Google AI 接続テスト用API
 * GET /api/test-ai
 */
export async function GET() {
  try {
    console.log('[Test AI] Testing Google AI connection...');
    console.log('[Test AI] Model:', GEMINI_MODEL);
    console.log('[Test AI] API Key present:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    const result = await streamText({
      model: google(GEMINI_MODEL),
      messages: [
        {
          role: 'user',
          content: 'Say hello',
        },
      ],
      temperature: 1.0,
      maxTokens: 50,
    });

    let fullResponse = '';
    let chunkCount = 0;
    
    for await (const chunk of result.textStream) {
      chunkCount++;
      console.log(`[Test AI] Chunk ${chunkCount}:`, chunk);
      fullResponse += chunk;
    }

    console.log('[Test AI] Final response:', fullResponse);
    console.log('[Test AI] Total chunks:', chunkCount);

    return Response.json({
      success: true,
      model: GEMINI_MODEL,
      response: fullResponse,
      chunkCount,
      message: fullResponse ? 'Google AI is working correctly' : 'Response was empty',
    });
  } catch (error) {
    console.error('[Test AI] Error:', error);
    console.error('[Test AI] Error details:', JSON.stringify(error, null, 2));
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        details: error,
      },
      { status: 500 }
    );
  }
}


