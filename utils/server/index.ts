import { Message } from "@/types/chat";
import { OpenAIModel } from "@/types/openai";

import {
  AZURE_DEPLOYMENT_ID,
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
} from "../app/const";

import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = "OpenAIError";
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature: number,
  key: string,
  messages: Message[],
) => {
  let url = `${OPENAI_API_HOST}/v1/chat/completions`;
  if (OPENAI_API_TYPE === "azure") {
    url =
      `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  }
  const controller = new AbortController();
  const timeout = 600000000 
  const id = setTimeout(() => controller.abort(), timeout);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(OPENAI_API_TYPE === "openai" && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`,
      }),
      ...(OPENAI_API_TYPE === "azure" && {
        "api-key": `${key ? key : process.env.OPENAI_API_KEY}`,
      }),
      ...((OPENAI_API_TYPE === "openai" && OPENAI_ORGANIZATION) && {
        "OpenAI-Organization": OPENAI_ORGANIZATION,
      }),
    },
    method: "POST",
    timeout: Infinity,
    signal: controller.signal,  
    body: JSON.stringify({
      ...(OPENAI_API_TYPE === "openai" && { model: model.id }),
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: 8000,
      temperature: temperature,
      stream: true,
    }),
  });
  clearTimeout(id);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    console.error("error making post to the /api endpoint locally")
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${
          decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        console.log(event.type);
        if (event.type === "event") {
          const data = event.data;

          try {
            const json = JSON.parse(data);
            console.log(json.choices[0]);

            if (
              json.choices[0].finish_reason != null &&
              json.choices[0].finish_reason !== ""
            ) {
              console.log("closing the controller.  Is it too early to do this?")
              controller.close();
              return;
            }
            if (json.choices[0].delta.role === 'assistant') {
              console.log("skipping role update")
              return
            }
            const text = json.choices[0].delta.content;
            if (text === "") { // probably just setting the role, so skip it
              console.log("empty text, so setting role")
              return
            }
            console.log(text);
            const queue = encoder.encode(text);
            controller.enqueue(queue);
            console.log("Added event to controller queue")
          } catch (e) {
            if (e instanceof SyntaxError) {
              console.error('Invalid JSON:', e.message);
              // controller.close()
          } else {
              console.log("Error!!!! %v ", e)
              // controller.error(e);
          }
            
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
