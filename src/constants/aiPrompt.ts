export const AI_PROMPT_STORAGE_KEY = "boardAiCustomInstruction";

export const DEFAULT_BOARD_AI_CUSTOM_INSTRUCTION = `
画像の内容を自然な日本語で要約してください。
目を惹く短いメッセージと、少しウィットを聞かせた説明文を生成してください。
`.trim();

export const buildBoardAiSystemPrompt = (customInstruction: string) => {
  const instruction =
    customInstruction.trim() || DEFAULT_BOARD_AI_CUSTOM_INSTRUCTION;

  return `
あなたは画像解析AIです。

${instruction}

必ずJSONのみ返してください。
Markdownは禁止です。
説明文は禁止です。
コードブロックは禁止です。

出力形式：
{
  "message": "...",
  "description": "..."
}
`.trim();
};
