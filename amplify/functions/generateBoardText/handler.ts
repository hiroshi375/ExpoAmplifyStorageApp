import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getUrl } from "aws-amplify/storage";

const s3 = new S3Client({});
const bedrock = new BedrockRuntimeClient({});

export const handler = async (event: any) => {
    console.log("=== Lambda START ===");
    console.log("EVENT:", JSON.stringify(event, null, 2));
    const { imageKey } = JSON.parse(event.body);
    console.log("imageKey =", imageKey); // ←ここに追加

    console.log("BUCKET =", process.env.BUCKET_NAME);
    console.log("REGION =", process.env.AWS_REGION);
    console.log("MODEL =", JSON.stringify({
        modelId: "jp.anthropic.claude-haiku-4-5-20251001-v1:0"
    }));
    console.log("S3 REQUEST:", {
        Bucket: "xxx",
        Key: imageKey,
    });
    // ① S3取得
    const image = await s3.send(new GetObjectCommand({
        //Bucket: process.env.BUCKET_NAME,
        Bucket: "amplify-expoamplifystorag-expostoragebucket60c87bc-xnpfpxaqzafb", // ←環境変数がない場合のフォールバック
        Key: imageKey,
    }));
    if (!image.Body) {
        throw new Error("S3 Body is empty");
    }
    const bytes = await image.Body.transformToByteArray();
    const base64 = Buffer.from(bytes).toString("base64");

    // ② Bedrock（Claude 3 Vision想定）
    const prompt = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 500,

        // -----------------------------
        // System Prompt
        // -----------------------------
        system: `
あなたは画像解析AIです。

画像の内容を自然な日本語で要約してください。
目を惹く短いメッセージと、少しウィットを聞かせた説明文を生成してください。

必ずJSONのみ返してください。
Markdownは禁止です。
説明文は禁止です。
コードブロックは禁止です。

出力形式：
{
  "message": "...",
  "description": "..."
}
`,

        // -----------------------------
        // User Prompt
        // -----------------------------
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: "image/jpeg",
                            data: base64
                        }
                    },
                    {
                        type: "text",
                        text: `
この画像について：

1. short message（1行。30文字以内。句点「。」は不要）
2. description（少し詳しく。100文字以内。句点「。」は不要）

を生成してください。
`                   }
                ]
            }
        ]
    };

    const result = await bedrock.send(new InvokeModelCommand({
        modelId: "jp.anthropic.claude-haiku-4-5-20251001-v1:0",
        body: JSON.stringify(prompt),
        contentType: "application/json",
    }));

    const body = JSON.parse(new TextDecoder().decode(result.body));

    const content = body.content?.[0]?.text ?? "";
    console.log("RAW CONTENT:", content);
    const cleaned = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
    const parsed = JSON.parse(cleaned);
    return {
        statusCode: 200,
        body: JSON.stringify({
            ok: true,
            message: parsed.message,
            description: parsed.description,
        }),
    };
};
