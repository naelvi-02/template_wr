import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, imageBase64 } = await req.json();

    const groqKey = process.env.GROQ_API_KEY || "";

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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API Error:", errorText);
      return NextResponse.json({ error: "Failed to fetch from Groq", details: errorText }, { status: response.status });
    }

    const data = await response.json();
    const completeMessage = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ success: true, message: completeMessage });

  } catch (error: any) {
    console.error("Groq Wrapper Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
