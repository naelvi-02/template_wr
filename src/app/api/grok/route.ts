import { NextResponse } from "next/server";
import crypto from "crypto";

// Generate a random statsig ID (base64 encoded fake TypeError)
function genStatsigID() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const alphaNum = "abcdefghijklmnopqrstuvwxyz0123456789";
  let msg = "";
  
  if (Math.random() < 0.5) {
    let b = "";
    for (let i = 0; i < 5; i++) b += alphaNum[Math.floor(Math.random() * alphaNum.length)];
    msg = `e:TypeError: Cannot read properties of null (reading 'children['${b}']')`;
  } else {
    let b = "";
    for (let i = 0; i < 10; i++) b += letters[Math.floor(Math.random() * letters.length)];
    msg = `e:TypeError: Cannot read properties of undefined (reading '${b}')`;
  }
  return Buffer.from(msg).toString('base64');
}

export async function POST(req: Request) {
  try {
    const { prompt, imageBase64 } = await req.json();

    const grokCookies = process.env.GROK_COOKIES;
    if (!grokCookies) {
      return NextResponse.json({ error: "GROK_COOKIES is not set in .env" }, { status: 500 });
    }

    const userAgent = process.env.GROK_USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";
    const xaiRequestId = crypto.randomUUID();
    const statsigId = genStatsigID();

    // Generate random sentry trace (32 hex chars - 16 hex chars - 0)
    const sentryTraceId = crypto.randomBytes(16).toString('hex');
    const sentrySpanId = crypto.randomBytes(8).toString('hex');
    const sentryTrace = `${sentryTraceId}-${sentrySpanId}-0`;

    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'baggage': `sentry-environment=production,sentry-release=c415d1eb1fd613dfe9cf9703d616d9e89738ee84,sentry-public_key=b311e0f2690c81f25e2c4cf6d4f7ce1c,sentry-trace_id=${sentryTraceId},sentry-org_id=4508179396558848,sentry-sampled=false,sentry-sample_rand=${Math.random()},sentry-sample_rate=0`,
      'content-type': 'application/json',
      'cookie': grokCookies,
      'origin': 'https://grok.com',
      'priority': 'u=1, i',
      'referer': 'https://grok.com/',
      'sec-ch-ua': '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'sentry-trace': sentryTrace,
      'traceparent': `00-${sentryTraceId}-${sentrySpanId}-00`,
      'user-agent': userAgent,
      'x-statsig-id': statsigId,
      'x-xai-request-id': xaiRequestId
    };

    const payload = {
      temporary: false,
      message: prompt,
      fileAttachments: [],
      imageAttachments: imageBase64 ? [imageBase64] : [],
      disableSearch: false,
      enableImageGeneration: false,
      returnImageBytes: false,
      returnRawGrokInXaiRequest: false,
      enableImageStreaming: false,
      imageGenerationCount: 0,
      forceConcise: false,
      toolOverrides: {},
      enableSideBySide: true,
      isPreset: false,
      sendFinalMetadata: true,
      customInstructions: "",
      deepsearchPreset: "",
      isReasoning: false
    };

    const response = await fetch("https://grok.com/rest/app-chat/conversations/new", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok API Error:", errorText);
      return NextResponse.json({ error: "Failed to fetch from Grok", details: errorText }, { status: response.status });
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    let completeMessage = "";
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.error) {
           return NextResponse.json({ error: data.error }, { status: 400 });
        }
        
        const modelResponse = data?.result?.response?.modelResponse?.message;
        if (modelResponse) {
           completeMessage = modelResponse;
           break; 
        }
        
        const token = data?.result?.response?.token;
        if (token) {
           completeMessage += token;
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: completeMessage });

  } catch (error: any) {
    console.error("Grok Wrapper Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
