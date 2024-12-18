import React from "react";
import randomIp from "./randomIp";
import { CompletionModel, Message } from "./types";

type CompletionProps = {
  model?: string;
  messages?: Message[];
};

function readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array> | undefined
) {
  return {
    async *[Symbol.asyncIterator]() {
      let readResult = await reader!.read();
      while (!readResult.done) {
        yield readResult.value;
        readResult = await reader!.read();
      }
    },
  };
}

export default class Deepinfra {
  models: CompletionModel[];

  constructor() {
    this.models = [];
  }

  async init() {
    const res = await fetch("https://api.deepinfra.com/models/featured", {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "content-type": "application/json",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-deepinfra-source": "web-embed",
        "x-forwarded-for": randomIp(),
      },
      referrer: "https://deepinfra.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
      mode: "cors",
      credentials: "omit",
    });
    const json = await res.json();
    this.models = json.filter(
      (f: CompletionModel) => f.type == "text-generation"
    );
  }

  async completionStream(
    props: CompletionProps,
    messages: Message[],
    setMessage: React.Dispatch<React.SetStateAction<Message[]>>,
    setLoadMessages: React.Dispatch<React.SetStateAction<boolean>>,
    setWaitDone: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    if (!props.messages?.length || !Array.isArray(props.messages)) {
      return {
        code: 400,
        data: {
          status: "error",
          message: "messages is required!",
        },
      };
    }

    for (let i = 0; i < props.messages.length; i++) {
      const m = props.messages[i];
      if (
        !Object.keys(m).includes("role") ||
        !["system", "user", "assistant"].includes(m.role) ||
        !Object.keys(m).includes("content") ||
        typeof m.content != "string"
      ) {
        return {
          code: 400,
          data: {
            status: "error",
            message: "invalid message format!",
          },
        };
      }
    }

    const model = this.models.find((f) => f.model_name === props.model)
      ? props.model
      : "meta-llama/Llama-2-70b-chat-hf";

    const requestInit: RequestInit = {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "content-type": "application/json",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-deepinfra-source": "web-embed",
        "x-forwarded-for": randomIp(),
      },
      referrer: "https://deepinfra.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify({ model, messages: props.messages, stream: true }),
      method: "POST",
      mode: "cors",
      credentials: "omit",
    };

    try {
      const response = await fetch(
        "https://api.deepinfra.com/v1/openai/chat/completions",
        requestInit
      );
      const textDecoder = new TextDecoder();
      const reader = response.body?.getReader();
      const responseData: Message = { role: "assistant", content: "" };
      setLoadMessages(false);
      setWaitDone(true);

      for await (const chunk of readChunks(reader)) {
        const resp = textDecoder
          .decode(chunk)
          .replace(/data: \{/gi, "{")
          .replace(/\r/gi, "")
          .trim();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        if (!resp.startsWith("{")) responseData.content += "";
        else {
          resp
            .split("\n")
            .filter((f) => f)
            .map((j) => {
              if (!j.startsWith("{")) responseData.content += "";
              else {
                responseData.content +=
                  JSON.parse(j).choices[0].delta.content ?? "";
              }
            });
        }

        setMessage([...messages, responseData]);
      }
      setWaitDone(false);

      return {
        code: 200,
        data: {
          status: "success",
          result: responseData,
        },
      };
    } catch (error) {
      return {
        code: 500,
        data: {
          status: "error",
          message: error?.toString(),
        },
      };
    }
  }

  async completion(props: CompletionProps) {
    if (!props.messages?.length || !Array.isArray(props.messages)) {
      return {
        code: 400,
        data: {
          status: "error",
          message: "messages is required!",
        },
      };
    }

    for (let i = 0; i < props.messages.length; i++) {
      const m = props.messages[i];
      if (
        !Object.keys(m).includes("role") ||
        !["system", "user", "assistant"].includes(m.role) ||
        !Object.keys(m).includes("content") ||
        typeof m.content != "string"
      ) {
        return {
          code: 400,
          data: {
            status: "error",
            message: "invalid message format!",
          },
        };
      }
    }

    const model = this.models.find((f) => f.model_name === props.model)
      ? props.model
      : "meta-llama/Meta-Llama-3.1-405B-Instruct";

    const requestInit: RequestInit = {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "content-type": "application/json",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-deepinfra-source": "web-embed",
        "x-forwarded-for": randomIp(),
      },
      referrer: "https://deepinfra.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify({ model, messages: props.messages, stream: false }),
      method: "POST",
      mode: "cors",
      credentials: "omit",
    };

    try {
      const response = (
        await (
          await fetch(
            "https://api.deepinfra.com/v1/openai/chat/completions",
            requestInit
          )
        ).json()
      ).choices[0].message;

      return {
        code: 200,
        data: {
          status: "success",
          result: response,
        },
      };
    } catch (error) {
      return {
        code: 500,
        data: {
          status: "error",
          message: error?.toString(),
        },
      };
    }
  }
}
