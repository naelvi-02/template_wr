const fs = require('fs');

async function testGrok() {
  const cookies = process.env.GROK_COOKIES;
  if (!cookies) {
    console.error("No GROK_COOKIES found in .env");
    return;
  }

  const payload = {
    temporary: false,
    message: "halo",
    fileAttachments: [],
    imageAttachments: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="],
    disableSearch: false,
    enableImageGeneration: true,
    returnImageBytes: false,
    returnRawGrokInXaiRequest: false,
    enableImageStreaming: true,
    imageGenerationCount: 2,
    forceConcise: false,
    enableSideBySide: true,
    sendFinalMetadata: true,
    disableTextFollowUps: false,
    responseMetadata: {},
    disableMemory: false,
    forceSideBySide: false,
    isAsyncChat: false,
    disableSelfHarmShortCircuit: false,
    collectionIds: [],
    disabledConnectorIds: [],
    deviceEnvInfo: {
      darkModeEnabled: true,
      devicePixelRatio: 1,
      screenWidth: 1680,
      screenHeight: 1050,
      viewportWidth: 917,
      viewportHeight: 914
    },
    modeId: "fast"
  };

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'baggage': 'sentry-environment=production,sentry-release=c415d1eb1fd613dfe9cf9703d616d9e89738ee84,sentry-public_key=b311e0f2690c81f25e2c4cf6d4f7ce1c,sentry-trace_id=605ba195bccbc4347d46714314cccdaa,sentry-org_id=4508179396558848,sentry-sampled=false,sentry-sample_rand=0.7972865875643818,sentry-sample_rate=0',
    'content-type': 'application/json',
    'cookie': cookies,
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

  console.log("Sending request to Grok API...");
  const response = await fetch("https://grok.com/rest/app-chat/conversations/new", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("HTTP ERROR:", response.status, await response.text());
    return;
  }

  const text = await response.text();
  console.log("Response starts with:", text.substring(0, 200));
}

testGrok();
