// @ts-nocheck

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReceiptItem = {
  name: string;
  price: number;
};

type GeminiReceiptResponse = {
  merchant?: string;
  date?: string;
  total?: number;
  currency?: string;
  category?: string;
  note?: string;
  items?: ReceiptItem[];
};

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Missing imageUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch receipt image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Image = btoa(binary);

    const prompt = `
You are extracting structured data from a purchase receipt.
Return ONLY valid JSON matching this schema:
{
  "merchant": "string or null",
  "date": "YYYY-MM-DD or null",
  "total": number or null,
  "currency": "ISO currency code or null",
  "category": "short expense category or null",
  "note": "short note or null",
  "items": [
    { "name": "string", "price": number }
  ]
}

Rules:
- Use the receipt totals, not guesses.
- If a field is not visible, use null.
- Items should be the visible line items from the receipt.
- If there are no line items, return an empty items array.
`;

    const requestBody = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: contentType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    async function callGemini(model: string) {
      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: requestBody,
        }
      );
    }

    const modelAttempts = ["gemini-3.1-flash-lite", "gemini-3.5-flash"];
    let geminiResponse: Response | null = null;
    let geminiErrorDetail = "";

    for (const model of modelAttempts) {
      geminiResponse = await callGemini(model);
      if (geminiResponse.ok) break;

      geminiErrorDetail = await geminiResponse.text();
      if (
        geminiResponse.status !== 503 &&
        geminiResponse.status !== 429 &&
        geminiResponse.status !== 404
      ) {
        break;
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Gemini request failed",
          detail: geminiErrorDetail,
          modelsTried: modelAttempts,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = await geminiResponse.json();
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("") ?? "";
    let parsed: GeminiReceiptResponse;
    try {
      parsed = JSON.parse(extractJson(text)) as GeminiReceiptResponse;
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse Gemini response",
          detail: String(parseError),
          raw: text,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
