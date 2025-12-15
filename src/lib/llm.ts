
export interface LLMOptions {
  max_tokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function generateLLMContent(prompt: string, apiKey: string, model: string = 'gpt-3.5-turbo', options: LLMOptions = {}): Promise<string> {
  const { max_tokens = 150, temperature = 0.7, jsonMode = false } = options;
  
  try {
    const body: any = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature,
      max_tokens: max_tokens
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errorDetails = response.statusText;
      try {
        const errorData = await response.text();
        errorDetails = `${response.status} ${response.statusText} - ${errorData}`;
        console.error('OpenAI API Error Details:', errorData);
      } catch (e) {
        // Ignore body parsing error
      }
      throw new Error(`OpenAI API Error: ${errorDetails}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Failed to generate LLM content:', error);
    throw error;
  }
}
