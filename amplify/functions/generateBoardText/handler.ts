import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getUrl } from "aws-amplify/storage";

const s3 = new S3Client({});
const bedrock = new BedrockRuntimeClient({});

// -----------------------------
// 共通エラーレスポンス
// -----------------------------
const returnError = (
    statusCode: number,
    errorCode: string,
    error: string
) => {
    return {
        statusCode,
        body: JSON.stringify({
            ok: false,
            errorCode,
            error,
        }),
    };
};

export const handler = async (event: any) => {
    try {
        console.log("=== Lambda START ===");
        console.log("EVENT:", JSON.stringify(event, null, 2));

        // -----------------------------
        // Request Parse
        // -----------------------------
        let imageKey = "";

        try {

            const body = JSON.parse(event.body);

            imageKey = body.imageKey;

            if (!imageKey) {
                return returnError(
                    400,
                    "INVALID_REQUEST",
                    "imageKey がありません"
                );
            }

        } catch (e) {

            return returnError(
                400,
                "INVALID_JSON",
                "リクエストJSONが不正です"
            );
        }

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
        let image;
        try {
            image = await s3.send(new GetObjectCommand({
                //Bucket: process.env.BUCKET_NAME,
                Bucket: "amplify-expoamplifystorag-expostoragebucket60c87bc-xnpfpxaqzafb", // ←環境変数がない場合のフォールバック
                Key: imageKey,
            }));
        } catch (e) {
            console.error("S3 GET ERROR:", e);
            return returnError(
                500,
                "S3_ERROR",
                "画像の取得に失敗しました"
            );
        }

        if (!image.Body) {
            throw new Error("S3 Body is empty");
        }
        // -----------------------------
        // 画像取得
        // -----------------------------
        const bytes = await image.Body.transformToByteArray();
        const base64 = Buffer.from(bytes).toString("base64");
        // -----------------------------
        // base64後画像サイズチェック
        // -----------------------------
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        const base64Size = Buffer.byteLength(base64, "utf8");

        console.log("BASE64 SIZE =", base64Size);
        if (base64Size > MAX_SIZE) {
            return returnError(
                400,
                "IMAGE_TOO_LARGE",
                `画像サイズが大きすぎます: ${base64Size} bytes`
            );
        }

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

        // -----------------------------
        // Bedrock実行
        // -----------------------------
        let result;
        try {
            result = await bedrock.send(new InvokeModelCommand({
                modelId: "jp.anthropic.claude-haiku-4-5-20251001-v1:0",
                body: JSON.stringify(prompt),
                contentType: "application/json",
            }));
        } catch (e) {
            console.error("Bedrock ERROR:", e);
            return returnError(
                500,
                "BEDROCK_ERROR",
                "Bedrock呼び出しに失敗しました"
            );
        }
        // -----------------------------
        // Response Parse
        // -----------------------------
        let parsed;
        try {
            const body = JSON.parse(new TextDecoder().decode(result.body));

            const content = body.content?.[0]?.text ?? "";
            console.log("RAW CONTENT:", content);
            const cleaned = content
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();
            parsed = JSON.parse(cleaned);
        } catch (e) {
            console.error("Response Parse ERROR:", e);
            return returnError(
                500,
                "INVALID_AI_RESPONSE",
                "AIの応答解析に失敗しました"
            );
        }
        // -----------------------------
        // Success
        // -----------------------------
        return {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                message: parsed.message,
                description: parsed.description,
            }),
        };
    } catch (e) {
        console.error("UNEXPECTED ERROR =", e);
        return returnError(
            500,
            "UNKNOWN_ERROR",
            "不明なエラーが発生しました"
        );
    }
};
