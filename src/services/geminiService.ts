function getFriendlyErrorMessage(rawMessage: string): string {
  const msg = String(rawMessage);
  if (msg.includes('currently experiencing high demand') || msg.includes('overloaded') || msg.includes('Spikes in demand')) {
    return '구글 AI 서버에 일시적으로 많은 요청이 몰려 대기 시간이 발생하고 있습니다. 잠시 후(약 5~10초 뒤) 다시 시도해 주시거나, 우측 상단에서 다른 모델(예: gemini-2.5-flash 또는 gemini-3.6-flash)로 변경하여 시도해 주세요.';
  }
  if (msg.includes('exhausted') || msg.includes('Quota exceeded') || msg.includes('rate limit')) {
    return 'API 사용 한도(할당량)를 초과했습니다. 잠시 후(약 1분 뒤) 다시 시도해 주시거나, 다른 모델로 변경하여 시도해 주세요.';
  }
  if (msg.includes('API key not valid') || msg.includes('not valid') || msg.includes('invalid key')) {
    return '입력하신 Gemini API Key가 올바르지 않거나 유효하지 않습니다. 상단 API Key 설정을 클릭하여 다시 한번 키를 확인해 주세요.';
  }
  if (msg.includes('location is not supported') || msg.includes('not supported in your country')) {
    return '현재 접속하신 지역/국가는 Gemini API 서비스가 지원되지 않는 지역입니다. VPN 등의 네트워크 환경을 확인해 주세요.';
  }
  return `API 오류가 발생했습니다: ${rawMessage}`;
}

export interface GenerateOptions {
  model: string;
  apiKey: string;
  systemInstruction: string;
  prompt: string;
}

export async function generateReport(options: GenerateOptions): Promise<string> {
  const { model, apiKey, systemInstruction, prompt } = options;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const isGemini36Flash = model.includes('3.6-flash');

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };

  if (isGemini36Flash) {
    requestBody.generationConfig = {
      thinkingConfig: {
        thinkingLevel: 'MEDIUM',
      },
    };
  } else {
    requestBody.generationConfig = {
      temperature: 0.6,
      topP: 0.95,
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const bodyText = await response.text();

    if (!response.ok) {
      try {
        const errJson = JSON.parse(bodyText);
        throw new Error(getFriendlyErrorMessage(errJson.error?.message || bodyText));
      } catch (pErr: any) {
        if (pErr.message && pErr.message.includes('구글 AI') || pErr.message.includes('API')) {
          throw pErr;
        }
        throw new Error(getFriendlyErrorMessage(bodyText));
      }
    }

    const responseJson = JSON.parse(bodyText);
    const text = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  } catch (err: any) {
    if (err.message && (err.message.includes('API') || err.message.includes('구글 AI'))) {
      throw err;
    }
    throw new Error('네트워크 연결을 확인해 주세요: ' + err.message);
  }
}
