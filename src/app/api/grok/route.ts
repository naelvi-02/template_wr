import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, imageBase64 } = await req.json();

    const grokCookies = process.env.GROK_COOKIES;
    if (!grokCookies) {
      return NextResponse.json({ error: "GROK_COOKIES is not set in .env" }, { status: 500 });
    }

    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'baggage': 'sentry-environment=production,sentry-release=c415d1eb1fd613dfe9cf9703d616d9e89738ee84,sentry-public_key=b311e0f2690c81f25e2c4cf6d4f7ce1c,sentry-trace_id=605ba195bccbc4347d46714314cccdaa,sentry-org_id=4508179396558848,sentry-sampled=false,sentry-sample_rand=0.7972865875643818,sentry-sample_rate=0',
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
      'sentry-trace': '605ba195bccbc4347d46714314cccdaa-a6d6adc70376ad27-0',
      'traceparent': '00-9dc96d692a485d3632a700df9179d529-a8775f33afe85adf-00',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      'x-statsig-id': 'FXBFTJiJsDmzSb6x3sND6JqHochHY13SdazMr+TwYEEKSG1CjR9Xs+sqmG5rzFqW9odB/BAJoKHdKZcV0sLVJuJA0gANFg',
      'x-xai-request-id': '555d72bd-62d0-4e74-b347-374643e02fa7'
    };

    // We will try inserting the image as a base64 string directly into imageAttachments, 
    // or as a data URL, to see if Grok accepts it without a separate upload RPC.
    // If it fails, the error message from Grok will help us debug.
    const payload = {
      temporary: false,
      message: prompt,
      fileAttachments: [],
      // TRY 1: Pass base64 data URL directly
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

    // Grok stream response consists of JSON lines
    // We will parse the stream and extract the complete response.
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
           break; // Got the final full message
        }
        
        // Accumulate tokens if streaming is handled this way
        const token = data?.result?.response?.token;
        if (token) {
           completeMessage += token;
        }
      } catch (e) {
        // ignore parse error on partial lines
      }
    }

    return NextResponse.json({ success: true, message: completeMessage });

  } catch (error: any) {
    console.error("Grok Wrapper Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
