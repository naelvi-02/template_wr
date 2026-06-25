import { NextResponse } from "next/server";

let currentKeyIndex = 0;

export async function POST(req: Request) {
  try {
    const { prompt, imageBase64 } = await req.json();

    const FALLBACK_KEYS = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3
    ].filter(Boolean) as string[];

    if (FALLBACK_KEYS.length === 0) {
      return NextResponse.json({ error: "No Groq API keys configured" }, { status: 500 });
    }

    const payload: any = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1024,
    };

    if (imageBase64) {
      payload.messages[0].content.push({
        type: "image_url",
        image_url: {
          url: imageBase64
        }
      });
    }

    let response;
    let attempts = 0;
    const maxAttempts = FALLBACK_KEYS.length;
    let errorText = "";

    while (attempts < maxAttempts) {
      const groqKey = FALLBACK_KEYS[currentKeyIndex];
      
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        break; // Success
      }

      errorText = await response.text();
      console.error(`Groq API Error with key index ${currentKeyIndex}:`, errorText);
      
      if (response.status === 429) {
        // Rate limit reached, try the next key
        currentKeyIndex = (currentKeyIndex + 1) % FALLBACK_KEYS.length;
        attempts++;
      } else {
        // Other error (e.g. 400 Bad Request), don't retry
        break;
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json({ error: "Failed to fetch from Groq after all retries", details: errorText }, { status: response?.status || 500 });
    }

    const data = await response.json();
    const completeMessage = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ success: true, message: completeMessage });

  } catch (error: any) {
    console.error("Groq Wrapper Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
