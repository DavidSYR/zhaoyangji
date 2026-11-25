import OpenAI from "openai";

const PROMPT =
  "你是一个工业品和日用品识别专家。用户拍了一张线下看到的物品照片。请返回 JSON：possibleNames 是 2-3 个可能的中文名称；searchKeywords 是 3 个适合在淘宝或闲鱼搜索的精准关键词，如果物品看起来像停产的老旧型号，其中至少一个关键词包含‘替代’或‘通用’；materialGuess 是一句话推测材质和用途。置信度低时，在 possibleNames 里加入‘建议重新拍摄’。不要返回 JSON 以外的任何内容。";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return Response.json(
        { error: "FormData 中缺少 image 文件" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "deepseek-flash",
      messages: [
        {
          role: "system",
          content:
            '只输出 JSON 对象，不要输出 JSON 以外的任何内容。JSON 必须且只能包含三个字段：possibleNames（字符串数组，2-3 个可能的中文名称）、searchKeywords（字符串数组，3 个精准搜索关键词）、materialGuess（字符串，一句话推测材质和用途）。示例：{"possibleNames":["名称一","名称二"],"searchKeywords":["关键词一","关键词二","关键词三"],"materialGuess":"材质与用途的一句话描述。"}',
        },
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("模型未返回任何内容");
    }

    return Response.json(JSON.parse(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
