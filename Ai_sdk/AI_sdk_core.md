
# Generating and Streaming Text

Large language models (LLMs) can generate text in response to a prompt, which can contain instructions and information to process.
For example, you can ask a model to come up with a recipe, draft an email, or summarize a document.

The AI SDK Core provides two functions to generate text and stream it from LLMs:

- [`generateText`](#generatetext): Generates text for a given prompt and model.
- [`streamText`](#streamtext): Streams text from a given prompt and model.

Advanced LLM features such as [tool calling](./tools-and-tool-calling) and [structured data generation](./generating-structured-data) are built on top of text generation.

## `generateText`

You can generate text using the [`generateText`](/docs/reference/ai-sdk-core/generate-text) function. This function is ideal for non-interactive use cases where you need to write text (e.g. drafting email or summarizing web pages) and for agents that use tools.

```tsx
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-4.1',
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

You can use more [advanced prompts](./prompts) to generate text with more complex instructions and content:

```tsx
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-4.1',
  system:
    'You are a professional writer. ' +
    'You write simple, clear, and concise content.',
  prompt: `Summarize the following article in 3-5 sentences: ${article}`,
});
```

The result object of `generateText` contains several promises that resolve when all required data is available:

- `result.content`: The content that was generated in the last step.
- `result.text`: The generated text.
- `result.reasoning`: The full reasoning that the model has generated in the last step.
- `result.reasoningText`: The reasoning text of the model (only available for some models).
- `result.files`: The files that were generated in the last step.
- `result.sources`: Sources that have been used as references in the last step (only available for some models).
- `result.toolCalls`: The tool calls that were made in the last step.
- `result.toolResults`: The results of the tool calls from the last step.
- `result.finishReason`: The reason the model finished generating text.
- `result.usage`: The usage of the model during the final step of text generation.
- `result.totalUsage`: The total usage across all steps (for multi-step generations).
- `result.warnings`: Warnings from the model provider (e.g. unsupported settings).
- `result.request`: Additional request information.
- `result.response`: Additional response information, including response messages and body.
- `result.providerMetadata`: Additional provider-specific metadata.
- `result.steps`: Details for all steps, useful for getting information about intermediate steps.
- `result.experimental_output`: The generated structured output using the `experimental_output` specification.

### Accessing response headers & body

Sometimes you need access to the full response from the model provider,
e.g. to access some provider-specific headers or body content.

You can access the raw response headers and body using the `response` property:

```ts
import { generateText } from 'ai';

const result = await generateText({
  // ...
});

console.log(JSON.stringify(result.response.headers, null, 2));
console.log(JSON.stringify(result.response.body, null, 2));
```

## `streamText`

Depending on your model and prompt, it can take a large language model (LLM) up to a minute to finish generating its response. This delay can be unacceptable for interactive use cases such as chatbots or real-time applications, where users expect immediate responses.

AI SDK Core provides the [`streamText`](/docs/reference/ai-sdk-core/stream-text) function which simplifies streaming text from LLMs:

```ts
import { streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Invent a new holiday and describe its traditions.',
});

// example: use textStream as an async iterable
for await (const textPart of result.textStream) {
  console.log(textPart);
}
```

<Note>
  `result.textStream` is both a `ReadableStream` and an `AsyncIterable`.
</Note>

<Note type="warning">
  `streamText` immediately starts streaming and suppresses errors to prevent
  server crashes. Use the `onError` callback to log errors.
</Note>

You can use `streamText` on its own or in combination with [AI SDK
UI](/examples/next-pages/basics/streaming-text-generation) and [AI SDK
RSC](/examples/next-app/basics/streaming-text-generation).
The result object contains several helper functions to make the integration into [AI SDK UI](/docs/ai-sdk-ui) easier:

- `result.toUIMessageStreamResponse()`: Creates a UI Message stream HTTP response (with tool calls etc.) that can be used in a Next.js App Router API route.
- `result.pipeUIMessageStreamToResponse()`: Writes UI Message stream delta output to a Node.js response-like object.
- `result.toTextStreamResponse()`: Creates a simple text stream HTTP response.
- `result.pipeTextStreamToResponse()`: Writes text delta output to a Node.js response-like object.

<Note>
  `streamText` is using backpressure and only generates tokens as they are
  requested. You need to consume the stream in order for it to finish.
</Note>

It also provides several promises that resolve when the stream is finished:

- `result.content`: The content that was generated in the last step.
- `result.text`: The generated text.
- `result.reasoning`: The full reasoning that the model has generated.
- `result.reasoningText`: The reasoning text of the model (only available for some models).
- `result.files`: Files that have been generated by the model in the last step.
- `result.sources`: Sources that have been used as references in the last step (only available for some models).
- `result.toolCalls`: The tool calls that have been executed in the last step.
- `result.toolResults`: The tool results that have been generated in the last step.
- `result.finishReason`: The reason the model finished generating text.
- `result.usage`: The usage of the model during the final step of text generation.
- `result.totalUsage`: The total usage across all steps (for multi-step generations).
- `result.warnings`: Warnings from the model provider (e.g. unsupported settings).
- `result.steps`: Details for all steps, useful for getting information about intermediate steps.
- `result.request`: Additional request information from the last step.
- `result.response`: Additional response information from the last step.
- `result.providerMetadata`: Additional provider-specific metadata from the last step.

### `onError` callback

`streamText` immediately starts streaming to enable sending data without waiting for the model.
Errors become part of the stream and are not thrown to prevent e.g. servers from crashing.

To log errors, you can provide an `onError` callback that is triggered when an error occurs.

```tsx highlight="6-8"
import { streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Invent a new holiday and describe its traditions.',
  onError({ error }) {
    console.error(error); // your error logging logic here
  },
});
```

### `onChunk` callback

When using `streamText`, you can provide an `onChunk` callback that is triggered for each chunk of the stream.

It receives the following chunk types:

- `text`
- `reasoning`
- `source`
- `tool-call`
- `tool-input-start`
- `tool-input-delta`
- `tool-result`
- `raw`

```tsx highlight="6-11"
import { streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Invent a new holiday and describe its traditions.',
  onChunk({ chunk }) {
    // implement your own logic here, e.g.:
    if (chunk.type === 'text') {
      console.log(chunk.text);
    }
  },
});
```

### `onFinish` callback

When using `streamText`, you can provide an `onFinish` callback that is triggered when the stream is finished (
[API Reference](/docs/reference/ai-sdk-core/stream-text#on-finish)
).
It contains the text, usage information, finish reason, messages, steps, total usage, and more:

```tsx highlight="6-8"
import { streamText } from 'ai';

const result = streamText({
  model: 'openai/gpt-4.1',
  prompt: 'Invent a new holiday and describe its traditions.',
  onFinish({ text, finishReason, usage, response, steps, totalUsage }) {
    // your own logic, e.g. for saving the chat history or recording usage

    const messages = response.messages; // messages that were generated
  },
});
```

### `fullStream` property

You can read a stream with all events using the `fullStream` property.
This can be useful if you want to implement your own UI or handle the stream in a different way.
Here is an example of how to use the `fullStream` property:

```tsx
import { streamText } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: 'openai/gpt-4.1',
  tools: {
    cityAttractions: {
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => ({
        attractions: ['attraction1', 'attraction2', 'attraction3'],
      }),
    },
  },
  prompt: 'What are some San Francisco tourist attractions?',
});

for await (const part of result.fullStream) {
  switch (part.type) {
    case 'start': {
      // handle start of stream
      break;
    }
    case 'start-step': {
      // handle start of step
      break;
    }
    case 'text-start': {
      // handle text start
      break;
    }
    case 'text-delta': {
      // handle text delta here
      break;
    }
    case 'text-end': {
      // handle text end
      break;
    }
    case 'reasoning-start': {
      // handle reasoning start
      break;
    }
    case 'reasoning-delta': {
      // handle reasoning delta here
      break;
    }
    case 'reasoning-end': {
      // handle reasoning end
      break;
    }
    case 'source': {
      // handle source here
      break;
    }
    case 'file': {
      // handle file here
      break;
    }
    case 'tool-call': {
      switch (part.toolName) {
        case 'cityAttractions': {
          // handle tool call here
          break;
        }
      }
      break;
    }
    case 'tool-input-start': {
      // handle tool input start
      break;
    }
    case 'tool-input-delta': {
      // handle tool input delta
      break;
    }
    case 'tool-input-end': {
      // handle tool input end
      break;
    }
    case 'tool-result': {
      switch (part.toolName) {
        case 'cityAttractions': {
          // handle tool result here
          break;
        }
      }
      break;
    }
    case 'tool-error': {
      // handle tool error
      break;
    }
    case 'finish-step': {
      // handle finish step
      break;
    }
    case 'finish': {
      // handle finish here
      break;
    }
    case 'error': {
      // handle error here
      break;
    }
    case 'raw': {
      // handle raw value
      break;
    }
  }
}
```

### Stream transformation

You can use the `experimental_transform` option to transform the stream.
This is useful for e.g. filtering, changing, or smoothing the text stream.

The transformations are applied before the callbacks are invoked and the promises are resolved.
If you e.g. have a transformation that changes all text to uppercase, the `onFinish` callback will receive the transformed text.

#### Smoothing streams

The AI SDK Core provides a [`smoothStream` function](/docs/reference/ai-sdk-core/smooth-stream) that
can be used to smooth out text streaming.

```tsx highlight="6"
import { smoothStream, streamText } from 'ai';

const result = streamText({
  model,
  prompt,
  experimental_transform: smoothStream(),
});
```

#### Custom transformations

You can also implement your own custom transformations.
The transformation function receives the tools that are available to the model,
and returns a function that is used to transform the stream.
Tools can either be generic or limited to the tools that you are using.

Here is an example of how to implement a custom transformation that converts
all text to uppercase:

```ts
const upperCaseTransform =
  <TOOLS extends ToolSet>() =>
  (options: { tools: TOOLS; stopStream: () => void }) =>
    new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        controller.enqueue(
          // for text chunks, convert the text to uppercase:
          chunk.type === 'text'
            ? { ...chunk, text: chunk.text.toUpperCase() }
            : chunk,
        );
      },
    });
```

You can also stop the stream using the `stopStream` function.
This is e.g. useful if you want to stop the stream when model guardrails are violated, e.g. by generating inappropriate content.

When you invoke `stopStream`, it is important to simulate the `step-finish` and `finish` events to guarantee that a well-formed stream is returned
and all callbacks are invoked.

```ts
const stopWordTransform =
  <TOOLS extends ToolSet>() =>
  ({ stopStream }: { stopStream: () => void }) =>
    new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      // note: this is a simplified transformation for testing;
      // in a real-world version more there would need to be
      // stream buffering and scanning to correctly emit prior text
      // and to detect all STOP occurrences.
      transform(chunk, controller) {
        if (chunk.type !== 'text') {
          controller.enqueue(chunk);
          return;
        }

        if (chunk.text.includes('STOP')) {
          // stop the stream
          stopStream();

          // simulate the finish-step event
          controller.enqueue({
            type: 'finish-step',
            finishReason: 'stop',
            logprobs: undefined,
            usage: {
              completionTokens: NaN,
              promptTokens: NaN,
              totalTokens: NaN,
            },
            request: {},
            response: {
              id: 'response-id',
              modelId: 'mock-model-id',
              timestamp: new Date(0),
            },
            warnings: [],
            isContinued: false,
          });

          // simulate the finish event
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            logprobs: undefined,
            usage: {
              completionTokens: NaN,
              promptTokens: NaN,
              totalTokens: NaN,
            },
            response: {
              id: 'response-id',
              modelId: 'mock-model-id',
              timestamp: new Date(0),
            },
          });

          return;
        }

        controller.enqueue(chunk);
      },
    });
```

#### Multiple transformations

You can also provide multiple transformations. They are applied in the order they are provided.

```tsx highlight="4"
const result = streamText({
  model,
  prompt,
  experimental_transform: [firstTransform, secondTransform],
});
```

## Sources

Some providers such as [Perplexity](/providers/ai-sdk-providers/perplexity#sources) and
[Google Generative AI](/providers/ai-sdk-providers/google-generative-ai#sources) include sources in the response.

Currently sources are limited to web pages that ground the response.
You can access them using the `sources` property of the result.

Each `url` source contains the following properties:

- `id`: The ID of the source.
- `url`: The URL of the source.
- `title`: The optional title of the source.
- `providerMetadata`: Provider metadata for the source.

When you use `generateText`, you can access the sources using the `sources` property:

```ts
const result = await generateText({
  model: google('gemini-2.5-flash'),
  tools: {
    google_search: google.tools.googleSearch({}),
  },
  prompt: 'List the top 5 San Francisco news from the past week.',
});

for (const source of result.sources) {
  if (source.sourceType === 'url') {
    console.log('ID:', source.id);
    console.log('Title:', source.title);
    console.log('URL:', source.url);
    console.log('Provider metadata:', source.providerMetadata);
    console.log();
  }
}
```

When you use `streamText`, you can access the sources using the `fullStream` property:

```tsx
const result = streamText({
  model: google('gemini-2.5-flash'),
  tools: {
    google_search: google.tools.googleSearch({}),
  },
  prompt: 'List the top 5 San Francisco news from the past week.',
});

for await (const part of result.fullStream) {
  if (part.type === 'source' && part.sourceType === 'url') {
    console.log('ID:', part.id);
    console.log('Title:', part.title);
    console.log('URL:', part.url);
    console.log('Provider metadata:', part.providerMetadata);
    console.log();
  }
}
```

The sources are also available in the `result.sources` promise.

## Examples

You can see `generateText` and `streamText` in action using various frameworks in the following examples:

### `generateText`

<ExampleLinks
  examples={[
    {
      title: 'Learn to generate text in Node.js',
      link: '/examples/node/generating-text/generate-text',
    },
    {
      title:
        'Learn to generate text in Next.js with Route Handlers (AI SDK UI)',
      link: '/examples/next-pages/basics/generating-text',
    },
    {
      title:
        'Learn to generate text in Next.js with Server Actions (AI SDK RSC)',
      link: '/examples/next-app/basics/generating-text',
    },
  ]}
/>

### `streamText`

<ExampleLinks
  examples={[
    {
      title: 'Learn to stream text in Node.js',
      link: '/examples/node/generating-text/stream-text',
    },
    {
      title: 'Learn to stream text in Next.js with Route Handlers (AI SDK UI)',
      link: '/examples/next-pages/basics/streaming-text-generation',
    },
    {
      title: 'Learn to stream text in Next.js with Server Actions (AI SDK RSC)',
      link: '/examples/next-app/basics/streaming-text-generation',
    },
  ]}
/>


# Generating Structured Data

While text generation can be useful, your use case will likely call for generating structured data.
For example, you might want to extract information from text, classify data, or generate synthetic data.

Many language models are capable of generating structured data, often defined as using "JSON modes" or "tools".
However, you need to manually provide schemas and then validate the generated data as LLMs can produce incorrect or incomplete structured data.

The AI SDK standardises structured object generation across model providers
with the [`generateObject`](/docs/reference/ai-sdk-core/generate-object)
and [`streamObject`](/docs/reference/ai-sdk-core/stream-object) functions.
You can use both functions with different output strategies, e.g. `array`, `object`, `enum`, or `no-schema`,
and with different generation modes, e.g. `auto`, `tool`, or `json`.
You can use [Zod schemas](/docs/reference/ai-sdk-core/zod-schema), [Valibot](/docs/reference/ai-sdk-core/valibot-schema), or [JSON schemas](/docs/reference/ai-sdk-core/json-schema) to specify the shape of the data that you want,
and the AI model will generate data that conforms to that structure.

<Note>
  You can pass Zod objects directly to the AI SDK functions or use the
  `zodSchema` helper function.
</Note>

## Generate Object

The `generateObject` generates structured data from a prompt.
The schema is also used to validate the generated data, ensuring type safety and correctness.

```ts
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: 'openai/gpt-4.1',
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
});
```

<Note>
  See `generateObject` in action with [these examples](#more-examples)
</Note>

### Accessing response headers & body

Sometimes you need access to the full response from the model provider,
e.g. to access some provider-specific headers or body content.

You can access the raw response headers and body using the `response` property:

```ts
import { generateObject } from 'ai';

const result = await generateObject({
  // ...
});

console.log(JSON.stringify(result.response.headers, null, 2));
console.log(JSON.stringify(result.response.body, null, 2));
```

## Stream Object

Given the added complexity of returning structured data, model response time can be unacceptable for your interactive use case.
With the [`streamObject`](/docs/reference/ai-sdk-core/stream-object) function, you can stream the model's response as it is generated.

```ts
import { streamObject } from 'ai';

const { partialObjectStream } = streamObject({
  // ...
});

// use partialObjectStream as an async iterable
for await (const partialObject of partialObjectStream) {
  console.log(partialObject);
}
```

You can use `streamObject` to stream generated UIs in combination with React Server Components (see [Generative UI](../ai-sdk-rsc))) or the [`useObject`](/docs/reference/ai-sdk-ui/use-object) hook.

<Note>See `streamObject` in action with [these examples](#more-examples)</Note>

### `onError` callback

`streamObject` immediately starts streaming.
Errors become part of the stream and are not thrown to prevent e.g. servers from crashing.

To log errors, you can provide an `onError` callback that is triggered when an error occurs.

```tsx highlight="5-7"
import { streamObject } from 'ai';

const result = streamObject({
  // ...
  onError({ error }) {
    console.error(error); // your error logging logic here
  },
});
```

## Output Strategy

You can use both functions with different output strategies, e.g. `array`, `object`, `enum`, or `no-schema`.

### Object

The default output strategy is `object`, which returns the generated data as an object.
You don't need to specify the output strategy if you want to use the default.

### Array

If you want to generate an array of objects, you can set the output strategy to `array`.
When you use the `array` output strategy, the schema specifies the shape of an array element.
With `streamObject`, you can also stream the generated array elements using `elementStream`.

```ts highlight="7,18"
import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { z } from 'zod';

const { elementStream } = streamObject({
  model: openai('gpt-4.1'),
  output: 'array',
  schema: z.object({
    name: z.string(),
    class: z
      .string()
      .describe('Character class, e.g. warrior, mage, or thief.'),
    description: z.string(),
  }),
  prompt: 'Generate 3 hero descriptions for a fantasy role playing game.',
});

for await (const hero of elementStream) {
  console.log(hero);
}
```

### Enum

If you want to generate a specific enum value, e.g. for classification tasks,
you can set the output strategy to `enum`
and provide a list of possible values in the `enum` parameter.

<Note>Enum output is only available with `generateObject`.</Note>

```ts highlight="5-6"
import { generateObject } from 'ai';

const { object } = await generateObject({
  model: 'openai/gpt-4.1',
  output: 'enum',
  enum: ['action', 'comedy', 'drama', 'horror', 'sci-fi'],
  prompt:
    'Classify the genre of this movie plot: ' +
    '"A group of astronauts travel through a wormhole in search of a ' +
    'new habitable planet for humanity."',
});
```

### No Schema

In some cases, you might not want to use a schema,
for example when the data is a dynamic user request.
You can use the `output` setting to set the output format to `no-schema` in those cases
and omit the schema parameter.

```ts highlight="6"
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';

const { object } = await generateObject({
  model: openai('gpt-4.1'),
  output: 'no-schema',
  prompt: 'Generate a lasagna recipe.',
});
```

## Schema Name and Description

You can optionally specify a name and description for the schema. These are used by some providers for additional LLM guidance, e.g. via tool or schema name.

```ts highlight="6-7"
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: 'openai/gpt-4.1',
  schemaName: 'Recipe',
  schemaDescription: 'A recipe for a dish.',
  schema: z.object({
    name: z.string(),
    ingredients: z.array(z.object({ name: z.string(), amount: z.string() })),
    steps: z.array(z.string()),
  }),
  prompt: 'Generate a lasagna recipe.',
});
```

## Accessing Reasoning

You can access the reasoning used by the language model to generate the object via the `reasoning` property on the result. This property contains a string with the model's thought process, if available.

```ts
import { openai, OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const result = await generateObject({
  model: openai('gpt-5'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
        }),
      ),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
  providerOptions: {
    openai: {
      strictJsonSchema: true,
      reasoningSummary: 'detailed',
    } satisfies OpenAIResponsesProviderOptions,
  },
});

console.log(result.reasoning);
```

## Error Handling

When `generateObject` cannot generate a valid object, it throws a [`AI_NoObjectGeneratedError`](/docs/reference/ai-sdk-errors/ai-no-object-generated-error).

This error occurs when the AI provider fails to generate a parsable object that conforms to the schema.
It can arise due to the following reasons:

- The model failed to generate a response.
- The model generated a response that could not be parsed.
- The model generated a response that could not be validated against the schema.

The error preserves the following information to help you log the issue:

- `text`: The text that was generated by the model. This can be the raw text or the tool call text, depending on the object generation mode.
- `response`: Metadata about the language model response, including response id, timestamp, and model.
- `usage`: Request token usage.
- `cause`: The cause of the error (e.g. a JSON parsing error). You can use this for more detailed error handling.

```ts
import { generateObject, NoObjectGeneratedError } from 'ai';

try {
  await generateObject({ model, schema, prompt });
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.log('NoObjectGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Text:', error.text);
    console.log('Response:', error.response);
    console.log('Usage:', error.usage);
  }
}
```

## Repairing Invalid or Malformed JSON

<Note type="warning">
  The `repairText` function is experimental and may change in the future.
</Note>

Sometimes the model will generate invalid or malformed JSON.
You can use the `repairText` function to attempt to repair the JSON.

It receives the error, either a `JSONParseError` or a `TypeValidationError`,
and the text that was generated by the model.
You can then attempt to repair the text and return the repaired text.

```ts highlight="7-10"
import { generateObject } from 'ai';

const { object } = await generateObject({
  model,
  schema,
  prompt,
  experimental_repairText: async ({ text, error }) => {
    // example: add a closing brace to the text
    return text + '}';
  },
});
```

## Structured outputs with `generateText` and `streamText`

You can generate structured data with `generateText` and `streamText` by using the `experimental_output` setting.

<Note>
  Some models, e.g. those by OpenAI, support structured outputs and tool calling
  at the same time. This is only possible with `generateText` and `streamText`.
</Note>

<Note type="warning">
  Structured output generation with `generateText` and `streamText` is
  experimental and may change in the future.
</Note>

### `generateText`

```ts highlight="2,4-18"
// experimental_output is a structured object that matches the schema:
const { experimental_output } = await generateText({
  // ...
  experimental_output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number().nullable().describe('Age of the person.'),
      contact: z.object({
        type: z.literal('email'),
        value: z.string(),
      }),
      occupation: z.object({
        type: z.literal('employed'),
        company: z.string(),
        position: z.string(),
      }),
    }),
  }),
  prompt: 'Generate an example person for testing.',
});
```

### `streamText`

```ts highlight="2,4-18"
// experimental_partialOutputStream contains generated partial objects:
const { experimental_partialOutputStream } = await streamText({
  // ...
  experimental_output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number().nullable().describe('Age of the person.'),
      contact: z.object({
        type: z.literal('email'),
        value: z.string(),
      }),
      occupation: z.object({
        type: z.literal('employed'),
        company: z.string(),
        position: z.string(),
      }),
    }),
  }),
  prompt: 'Generate an example person for testing.',
});
```

## More Examples

You can see `generateObject` and `streamObject` in action using various frameworks in the following examples:

### `generateObject`

<ExampleLinks
  examples={[
    {
      title: 'Learn to generate objects in Node.js',
      link: '/examples/node/generating-structured-data/generate-object',
    },
    {
      title:
        'Learn to generate objects in Next.js with Route Handlers (AI SDK UI)',
      link: '/examples/next-pages/basics/generating-object',
    },
    {
      title:
        'Learn to generate objects in Next.js with Server Actions (AI SDK RSC)',
      link: '/examples/next-app/basics/generating-object',
    },
  ]}
/>

### `streamObject`

<ExampleLinks
  examples={[
    {
      title: 'Learn to stream objects in Node.js',
      link: '/examples/node/streaming-structured-data/stream-object',
    },
    {
      title:
        'Learn to stream objects in Next.js with Route Handlers (AI SDK UI)',
      link: '/examples/next-pages/basics/streaming-object-generation',
    },
    {
      title:
        'Learn to stream objects in Next.js with Server Actions (AI SDK RSC)',
      link: '/examples/next-app/basics/streaming-object-generation',
    },
  ]}
/>


# Tool Calling

As covered under Foundations, [tools](/docs/foundations/tools) are objects that can be called by the model to perform a specific task.
AI SDK Core tools contain three elements:

- **`description`**: An optional description of the tool that can influence when the tool is picked.
- **`inputSchema`**: A [Zod schema](/docs/foundations/tools#schemas) or a [JSON schema](/docs/reference/ai-sdk-core/json-schema) that defines the input parameters. The schema is consumed by the LLM, and also used to validate the LLM tool calls.
- **`execute`**: An optional async function that is called with the inputs from the tool call. It produces a value of type `RESULT` (generic type). It is optional because you might want to forward tool calls to the client or to a queue instead of executing them in the same process.

<Note className="mb-2">
  You can use the [`tool`](/docs/reference/ai-sdk-core/tool) helper function to
  infer the types of the `execute` parameters.
</Note>

The `tools` parameter of `generateText` and `streamText` is an object that has the tool names as keys and the tools as values:

```ts highlight="6-17"
import { z } from 'zod';
import { generateText, tool } from 'ai';

const result = await generateText({
  model: 'openai/gpt-4o',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  prompt: 'What is the weather in San Francisco?',
});
```

<Note>
  When a model uses a tool, it is called a "tool call" and the output of the
  tool is called a "tool result".
</Note>

Tool calling is not restricted to only text generation.
You can also use it to render user interfaces (Generative UI).

## Multi-Step Calls (using stopWhen)

With the `stopWhen` setting, you can enable multi-step calls in `generateText` and `streamText`. When `stopWhen` is set and the model generates a tool call, the AI SDK will trigger a new generation passing in the tool result until there are no further tool calls or the stopping condition is met.

<Note>
  The `stopWhen` conditions are only evaluated when the last step contains tool
  results.
</Note>

By default, when you use `generateText` or `streamText`, it triggers a single generation. This works well for many use cases where you can rely on the model's training data to generate a response. However, when you provide tools, the model now has the choice to either generate a normal text response, or generate a tool call. If the model generates a tool call, it's generation is complete and that step is finished.

You may want the model to generate text after the tool has been executed, either to summarize the tool results in the context of the users query. In many cases, you may also want the model to use multiple tools in a single response. This is where multi-step calls come in.

You can think of multi-step calls in a similar way to a conversation with a human. When you ask a question, if the person does not have the requisite knowledge in their common knowledge (a model's training data), the person may need to look up information (use a tool) before they can provide you with an answer. In the same way, the model may need to call a tool to get the information it needs to answer your question where each generation (tool call or text generation) is a step.

### Example

In the following example, there are two steps:

1. **Step 1**
   1. The prompt `'What is the weather in San Francisco?'` is sent to the model.
   1. The model generates a tool call.
   1. The tool call is executed.
1. **Step 2**
   1. The tool result is sent to the model.
   1. The model generates a response considering the tool result.

```ts highlight="18-19"
import { z } from 'zod';
import { generateText, tool, stepCountIs } from 'ai';

const { text, steps } = await generateText({
  model: 'openai/gpt-4o',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  stopWhen: stepCountIs(5), // stop after a maximum of 5 steps if tools were called
  prompt: 'What is the weather in San Francisco?',
});
```

<Note>You can use `streamText` in a similar way.</Note>

### Steps

To access intermediate tool calls and results, you can use the `steps` property in the result object
or the `streamText` `onFinish` callback.
It contains all the text, tool calls, tool results, and more from each step.

#### Example: Extract tool results from all steps

```ts highlight="3,9-10"
import { generateText } from 'ai';

const { steps } = await generateText({
  model: openai('gpt-4o'),
  stopWhen: stepCountIs(10),
  // ...
});

// extract all tool calls from the steps:
const allToolCalls = steps.flatMap(step => step.toolCalls);
```

### `onStepFinish` callback

When using `generateText` or `streamText`, you can provide an `onStepFinish` callback that
is triggered when a step is finished,
i.e. all text deltas, tool calls, and tool results for the step are available.
When you have multiple steps, the callback is triggered for each step.

```tsx highlight="5-7"
import { generateText } from 'ai';

const result = await generateText({
  // ...
  onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
    // your own logic, e.g. for saving the chat history or recording usage
  },
});
```

### `prepareStep` callback

The `prepareStep` callback is called before a step is started.

It is called with the following parameters:

- `model`: The model that was passed into `generateText`.
- `stopWhen`: The stopping condition that was passed into `generateText`.
- `stepNumber`: The number of the step that is being executed.
- `steps`: The steps that have been executed so far.
- `messages`: The messages that will be sent to the model for the current step.

You can use it to provide different settings for a step, including modifying the input messages.

```tsx highlight="5-7"
import { generateText } from 'ai';

const result = await generateText({
  // ...
  prepareStep: async ({ model, stepNumber, steps, messages }) => {
    if (stepNumber === 0) {
      return {
        // use a different model for this step:
        model: modelForThisParticularStep,
        // force a tool choice for this step:
        toolChoice: { type: 'tool', toolName: 'tool1' },
        // limit the tools that are available for this step:
        activeTools: ['tool1'],
      };
    }

    // when nothing is returned, the default settings are used
  },
});
```

#### Message Modification for Longer Agentic Loops

In longer agentic loops, you can use the `messages` parameter to modify the input messages for each step. This is particularly useful for prompt compression:

```tsx
prepareStep: async ({ stepNumber, steps, messages }) => {
  // Compress conversation history for longer loops
  if (messages.length > 20) {
    return {
      messages: messages.slice(-10),
    };
  }

  return {};
},
```

## Response Messages

Adding the generated assistant and tool messages to your conversation history is a common task,
especially if you are using multi-step tool calls.

Both `generateText` and `streamText` have a `response.messages` property that you can use to
add the assistant and tool messages to your conversation history.
It is also available in the `onFinish` callback of `streamText`.

The `response.messages` property contains an array of `ModelMessage` objects that you can add to your conversation history:

```ts
import { generateText, ModelMessage } from 'ai';

const messages: ModelMessage[] = [
  // ...
];

const { response } = await generateText({
  // ...
  messages,
});

// add the response messages to your conversation history:
messages.push(...response.messages); // streamText: ...((await response).messages)
```

## Dynamic Tools

AI SDK Core supports dynamic tools for scenarios where tool schemas are not known at compile time. This is useful for:

- MCP (Model Context Protocol) tools without schemas
- User-defined functions at runtime
- Tools loaded from external sources

### Using dynamicTool

The `dynamicTool` helper creates tools with unknown input/output types:

```ts
import { dynamicTool } from 'ai';
import { z } from 'zod';

const customTool = dynamicTool({
  description: 'Execute a custom function',
  inputSchema: z.object({}),
  execute: async input => {
    // input is typed as 'unknown'
    // You need to validate/cast it at runtime
    const { action, parameters } = input as any;

    // Execute your dynamic logic
    return { result: `Executed ${action}` };
  },
});
```

### Type-Safe Handling

When using both static and dynamic tools, use the `dynamic` flag for type narrowing:

```ts
const result = await generateText({
  model: 'openai/gpt-4o',
  tools: {
    // Static tool with known types
    weather: weatherTool,
    // Dynamic tool
    custom: dynamicTool({
      /* ... */
    }),
  },
  onStepFinish: ({ toolCalls, toolResults }) => {
    // Type-safe iteration
    for (const toolCall of toolCalls) {
      if (toolCall.dynamic) {
        // Dynamic tool: input is 'unknown'
        console.log('Dynamic:', toolCall.toolName, toolCall.input);
        continue;
      }

      // Static tool: full type inference
      switch (toolCall.toolName) {
        case 'weather':
          console.log(toolCall.input.location); // typed as string
          break;
      }
    }
  },
});
```

## Preliminary Tool Results

You can return an `AsyncIterable` over multiple results.
In this case, the last value from the iterable is the final tool result.

This can be used in combination with generator functions to e.g. stream status information
during the tool execution:

```ts
tool({
  description: 'Get the current weather.',
  inputSchema: z.object({
    location: z.string(),
  }),
  async *execute({ location }) {
    yield {
      status: 'loading' as const,
      text: `Getting weather for ${location}`,
      weather: undefined,
    };

    await new Promise(resolve => setTimeout(resolve, 3000));

    const temperature = 72 + Math.floor(Math.random() * 21) - 10;

    yield {
      status: 'success' as const,
      text: `The weather in ${location} is ${temperature}°F`,
      temperature,
    };
  },
});
```

## Tool Choice

You can use the `toolChoice` setting to influence when a tool is selected.
It supports the following settings:

- `auto` (default): the model can choose whether and which tools to call.
- `required`: the model must call a tool. It can choose which tool to call.
- `none`: the model must not call tools
- `{ type: 'tool', toolName: string (typed) }`: the model must call the specified tool

```ts highlight="18"
import { z } from 'zod';
import { generateText, tool } from 'ai';

const result = await generateText({
  model: 'openai/gpt-4o',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  toolChoice: 'required', // force the model to call a tool
  prompt: 'What is the weather in San Francisco?',
});
```

## Tool Execution Options

When tools are called, they receive additional options as a second parameter.

### Tool Call ID

The ID of the tool call is forwarded to the tool execution.
You can use it e.g. when sending tool-call related information with stream data.

```ts highlight="14-20"
import {
  streamText,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        // ...
        messages,
        tools: {
          myTool: tool({
            // ...
            execute: async (args, { toolCallId }) => {
              // return e.g. custom status for tool call
              writer.write({
                type: 'data-tool-status',
                id: toolCallId,
                data: {
                  name: 'myTool',
                  status: 'in-progress',
                },
              });
              // ...
            },
          }),
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

### Messages

The messages that were sent to the language model to initiate the response that contained the tool call are forwarded to the tool execution.
You can access them in the second parameter of the `execute` function.
In multi-step calls, the messages contain the text, tool calls, and tool results from all previous steps.

```ts highlight="8-9"
import { generateText, tool } from 'ai';

const result = await generateText({
  // ...
  tools: {
    myTool: tool({
      // ...
      execute: async (args, { messages }) => {
        // use the message history in e.g. calls to other language models
        return { ... };
      },
    }),
  },
});
```

### Abort Signals

The abort signals from `generateText` and `streamText` are forwarded to the tool execution.
You can access them in the second parameter of the `execute` function and e.g. abort long-running computations or forward them to fetch calls inside tools.

```ts highlight="6,11,14"
import { z } from 'zod';
import { generateText, tool } from 'ai';

const result = await generateText({
  model: 'openai/gpt-4.1',
  abortSignal: myAbortSignal, // signal that will be forwarded to tools
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({ location: z.string() }),
      execute: async ({ location }, { abortSignal }) => {
        return fetch(
          `https://api.weatherapi.com/v1/current.json?q=${location}`,
          { signal: abortSignal }, // forward the abort signal to fetch
        );
      },
    }),
  },
  prompt: 'What is the weather in San Francisco?',
});
```

### Context (experimental)

You can pass in arbitrary context from `generateText` or `streamText` via the `experimental_context` setting.
This context is available in the `experimental_context` tool execution option.

```ts
const result = await generateText({
  // ...
  tools: {
    someTool: tool({
      // ...
      execute: async (input, { experimental_context: context }) => {
        const typedContext = context as { example: string }; // or use type validation library
        // ...
      },
    }),
  },
  experimental_context: { example: '123' },
});
```

## Types

Modularizing your code often requires defining types to ensure type safety and reusability.
To enable this, the AI SDK provides several helper types for tools, tool calls, and tool results.

You can use them to strongly type your variables, function parameters, and return types
in parts of the code that are not directly related to `streamText` or `generateText`.

Each tool call is typed with `ToolCall<NAME extends string, ARGS>`, depending
on the tool that has been invoked.
Similarly, the tool results are typed with `ToolResult<NAME extends string, ARGS, RESULT>`.

The tools in `streamText` and `generateText` are defined as a `ToolSet`.
The type inference helpers `TypedToolCall<TOOLS extends ToolSet>`
and `TypedToolResult<TOOLS extends ToolSet>` can be used to
extract the tool call and tool result types from the tools.

```ts highlight="18-19,23-24"
import { openai } from '@ai-sdk/openai';
import { TypedToolCall, TypedToolResult, generateText, tool } from 'ai';
import { z } from 'zod';

const myToolSet = {
  firstTool: tool({
    description: 'Greets the user',
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => `Hello, ${name}!`,
  }),
  secondTool: tool({
    description: 'Tells the user their age',
    inputSchema: z.object({ age: z.number() }),
    execute: async ({ age }) => `You are ${age} years old!`,
  }),
};

type MyToolCall = TypedToolCall<typeof myToolSet>;
type MyToolResult = TypedToolResult<typeof myToolSet>;

async function generateSomething(prompt: string): Promise<{
  text: string;
  toolCalls: Array<MyToolCall>; // typed tool calls
  toolResults: Array<MyToolResult>; // typed tool results
}> {
  return generateText({
    model: openai('gpt-4.1'),
    tools: myToolSet,
    prompt,
  });
}
```

## Handling Errors

The AI SDK has three tool-call related errors:

- [`NoSuchToolError`](/docs/reference/ai-sdk-errors/ai-no-such-tool-error): the model tries to call a tool that is not defined in the tools object
- [`InvalidToolInputError`](/docs/reference/ai-sdk-errors/ai-invalid-tool-input-error): the model calls a tool with inputs that do not match the tool's input schema
- [`ToolCallRepairError`](/docs/reference/ai-sdk-errors/ai-tool-call-repair-error): an error that occurred during tool call repair

When tool execution fails (errors thrown by your tool's `execute` function), the AI SDK adds them as `tool-error` content parts to enable automated LLM roundtrips in multi-step scenarios.

### `generateText`

`generateText` throws errors for tool schema validation issues and other errors, and can be handled using a `try`/`catch` block. Tool execution errors appear as `tool-error` parts in the result steps:

```ts
try {
  const result = await generateText({
    //...
  });
} catch (error) {
  if (NoSuchToolError.isInstance(error)) {
    // handle the no such tool error
  } else if (InvalidToolInputError.isInstance(error)) {
    // handle the invalid tool inputs error
  } else {
    // handle other errors
  }
}
```

Tool execution errors are available in the result steps:

```ts
const { steps } = await generateText({
  // ...
});

// check for tool errors in the steps
const toolErrors = steps.flatMap(step =>
  step.content.filter(part => part.type === 'tool-error'),
);

toolErrors.forEach(toolError => {
  console.log('Tool error:', toolError.error);
  console.log('Tool name:', toolError.toolName);
  console.log('Tool input:', toolError.input);
});
```

### `streamText`

`streamText` sends errors as part of the full stream. Tool execution errors appear as `tool-error` parts, while other errors appear as `error` parts.

When using `toUIMessageStreamResponse`, you can pass an `onError` function to extract the error message from the error part and forward it as part of the stream response:

```ts
const result = streamText({
  // ...
});

return result.toUIMessageStreamResponse({
  onError: error => {
    if (NoSuchToolError.isInstance(error)) {
      return 'The model tried to call a unknown tool.';
    } else if (InvalidToolInputError.isInstance(error)) {
      return 'The model called a tool with invalid inputs.';
    } else {
      return 'An unknown error occurred.';
    }
  },
});
```

## Tool Call Repair

<Note type="warning">
  The tool call repair feature is experimental and may change in the future.
</Note>

Language models sometimes fail to generate valid tool calls,
especially when the input schema is complex or the model is smaller.

If you use multiple steps, those failed tool calls will be sent back to the LLM
in the next step to give it an opportunity to fix it.
However, you may want to control how invalid tool calls are repaired without requiring
additional steps that pollute the message history.

You can use the `experimental_repairToolCall` function to attempt to repair the tool call
with a custom function.

You can use different strategies to repair the tool call:

- Use a model with structured outputs to generate the inputs.
- Send the messages, system prompt, and tool schema to a stronger model to generate the inputs.
- Provide more specific repair instructions based on which tool was called.

### Example: Use a model with structured outputs for repair

```ts
import { openai } from '@ai-sdk/openai';
import { generateObject, generateText, NoSuchToolError, tool } from 'ai';

const result = await generateText({
  model,
  tools,
  prompt,

  experimental_repairToolCall: async ({
    toolCall,
    tools,
    inputSchema,
    error,
  }) => {
    if (NoSuchToolError.isInstance(error)) {
      return null; // do not attempt to fix invalid tool names
    }

    const tool = tools[toolCall.toolName as keyof typeof tools];

    const { object: repairedArgs } = await generateObject({
      model: openai('gpt-4.1'),
      schema: tool.inputSchema,
      prompt: [
        `The model tried to call the tool "${toolCall.toolName}"` +
          ` with the following inputs:`,
        JSON.stringify(toolCall.input),
        `The tool accepts the following schema:`,
        JSON.stringify(inputSchema(toolCall)),
        'Please fix the inputs.',
      ].join('\n'),
    });

    return { ...toolCall, input: JSON.stringify(repairedArgs) };
  },
});
```

### Example: Use the re-ask strategy for repair

```ts
import { openai } from '@ai-sdk/openai';
import { generateObject, generateText, NoSuchToolError, tool } from 'ai';

const result = await generateText({
  model,
  tools,
  prompt,

  experimental_repairToolCall: async ({
    toolCall,
    tools,
    error,
    messages,
    system,
  }) => {
    const result = await generateText({
      model,
      system,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              input: toolCall.input,
            },
          ],
        },
        {
          role: 'tool' as const,
          content: [
            {
              type: 'tool-result',
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              output: error.message,
            },
          ],
        },
      ],
      tools,
    });

    const newToolCall = result.toolCalls.find(
      newToolCall => newToolCall.toolName === toolCall.toolName,
    );

    return newToolCall != null
      ? {
          toolCallType: 'function' as const,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: JSON.stringify(newToolCall.input),
        }
      : null;
  },
});
```

## Active Tools

Language models can only handle a limited number of tools at a time, depending on the model.
To allow for static typing using a large number of tools and limiting the available tools to the model at the same time,
the AI SDK provides the `activeTools` property.

It is an array of tool names that are currently active.
By default, the value is `undefined` and all tools are active.

```ts highlight="7"
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openai('gpt-4.1'),
  tools: myToolSet,
  activeTools: ['firstTool'],
});
```

## Multi-modal Tool Results

<Note type="warning">
  Multi-modal tool results are experimental and only supported by Anthropic.
</Note>

In order to send multi-modal tool results, e.g. screenshots, back to the model,
they need to be converted into a specific format.

AI SDK Core tools have an optional `toModelOutput` function
that converts the tool result into a content part.

Here is an example for converting a screenshot into a content part:

```ts highlight="22-27"
const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools: {
    computer: anthropic.tools.computer_20241022({
      // ...
      async execute({ action, coordinate, text }) {
        switch (action) {
          case 'screenshot': {
            return {
              type: 'image',
              data: fs
                .readFileSync('./data/screenshot-editor.png')
                .toString('base64'),
            };
          }
          default: {
            return `executed ${action}`;
          }
        }
      },

      // map to tool result content for LLM consumption:
      toModelOutput(result) {
        return {
          type: 'content',
          value:
            typeof result === 'string'
              ? [{ type: 'text', text: result }]
              : [{ type: 'image', data: result.data, mediaType: 'image/png' }],
        };
      },
    }),
  },
  // ...
});
```

## Extracting Tools

Once you start having many tools, you might want to extract them into separate files.
The `tool` helper function is crucial for this, because it ensures correct type inference.

Here is an example of an extracted tool:

```ts filename="tools/weather-tool.ts" highlight="1,4-5"
import { tool } from 'ai';
import { z } from 'zod';

// the `tool` helper function ensures correct type inference:
export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});
```

## MCP Tools

The AI SDK supports connecting to Model Context Protocol (MCP) servers to access their tools.
MCP enables your AI applications to discover and use tools across various services through a standardized interface.

For detailed information about MCP tools, including initialization, transport options, and usage patterns, see the [MCP Tools documentation](/docs/ai-sdk-core/mcp-tools).

### AI SDK Tools vs MCP Tools

In most cases, you should define your own AI SDK tools for production applications. They provide full control, type safety, and optimal performance. MCP tools are best suited for rapid development iteration and scenarios where users bring their own tools.

| Aspect                 | AI SDK Tools                                              | MCP Tools                                             |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| **Type Safety**        | Full static typing end-to-end                             | Dynamic discovery at runtime                          |
| **Execution**          | Same process as your request (low latency)                | Separate server (network overhead)                    |
| **Prompt Control**     | Full control over descriptions and schemas                | Controlled by MCP server owner                        |
| **Schema Control**     | You define and optimize for your model                    | Controlled by MCP server owner                        |
| **Version Management** | Full visibility over updates                              | Can update independently (version skew risk)          |
| **Authentication**     | Same process, no additional auth required                 | Separate server introduces additional auth complexity |
| **Best For**           | Production applications requiring control and performance | Development iteration, user-provided tools            |

## Examples

You can see tools in action using various frameworks in the following examples:

<ExampleLinks
  examples={[
    {
      title: 'Learn to use tools in Node.js',
      link: '/cookbook/node/call-tools',
    },
    {
      title: 'Learn to use tools in Next.js with Route Handlers',
      link: '/cookbook/next/call-tools',
    },
    {
      title: 'Learn to use MCP tools in Node.js',
      link: '/cookbook/node/mcp-tools',
    },
  ]}
/>


# Prompt Engineering

## Tips

### Prompts for Tools

When you create prompts that include tools, getting good results can be tricky as the number and complexity of your tools increases.

Here are a few tips to help you get the best results:

1. Use a model that is strong at tool calling, such as `gpt-4` or `gpt-4.1`. Weaker models will often struggle to call tools effectively and flawlessly.
1. Keep the number of tools low, e.g. to 5 or less.
1. Keep the complexity of the tool parameters low. Complex Zod schemas with many nested and optional elements, unions, etc. can be challenging for the model to work with.
1. Use semantically meaningful names for your tools, parameters, parameter properties, etc. The more information you pass to the model, the better it can understand what you want.
1. Add `.describe("...")` to your Zod schema properties to give the model hints about what a particular property is for.
1. When the output of a tool might be unclear to the model and there are dependencies between tools, use the `description` field of a tool to provide information about the output of the tool execution.
1. You can include example input/outputs of tool calls in your prompt to help the model understand how to use the tools. Keep in mind that the tools work with JSON objects, so the examples should use JSON.

In general, the goal should be to give the model all information it needs in a clear way.

### Tool & Structured Data Schemas

The mapping from Zod schemas to LLM inputs (typically JSON schema) is not always straightforward, since the mapping is not one-to-one.

#### Zod Dates

Zod expects JavaScript Date objects, but models return dates as strings.
You can specify and validate the date format using `z.string().datetime()` or `z.string().date()`,
and then use a Zod transformer to convert the string to a Date object.

```ts highlight="7-10"
const result = await generateObject({
  model: openai('gpt-4.1'),
  schema: z.object({
    events: z.array(
      z.object({
        event: z.string(),
        date: z
          .string()
          .date()
          .transform(value => new Date(value)),
      }),
    ),
  }),
  prompt: 'List 5 important events from the year 2000.',
});
```

#### Optional Parameters

When working with tools that have optional parameters, you may encounter compatibility issues with certain providers that use strict schema validation.

<Note>
  This is particularly relevant for OpenAI models with structured outputs
  (strict mode).
</Note>

For maximum compatibility, optional parameters should use `.nullable()` instead of `.optional()`:

```ts highlight="6,7,16,17"
// This may fail with strict schema validation
const failingTool = tool({
  description: 'Execute a command',
  inputSchema: z.object({
    command: z.string(),
    workdir: z.string().optional(), // This can cause errors
    timeout: z.string().optional(),
  }),
});

// This works with strict schema validation
const workingTool = tool({
  description: 'Execute a command',
  inputSchema: z.object({
    command: z.string(),
    workdir: z.string().nullable(), // Use nullable instead
    timeout: z.string().nullable(),
  }),
});
```

#### Temperature Settings

For tool calls and object generation, it's recommended to use `temperature: 0` to ensure deterministic and consistent results:

```ts highlight="3"
const result = await generateText({
  model: openai('gpt-4o'),
  temperature: 0, // Recommended for tool calls
  tools: {
    myTool: tool({
      description: 'Execute a command',
      inputSchema: z.object({
        command: z.string(),
      }),
    }),
  },
  prompt: 'Execute the ls command',
});
```

Lower temperature values reduce randomness in model outputs, which is particularly important when the model needs to:

- Generate structured data with specific formats
- Make precise tool calls with correct parameters
- Follow strict schemas consistently

## Debugging

### Inspecting Warnings

Not all providers support all AI SDK features.
Providers either throw exceptions or return warnings when they do not support a feature.
To check if your prompt, tools, and settings are handled correctly by the provider, you can check the call warnings:

```ts
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello, world!',
});

console.log(result.warnings);
```

### HTTP Request Bodies

You can inspect the raw HTTP request bodies for models that expose them, e.g. [OpenAI](/providers/ai-sdk-providers/openai).
This allows you to inspect the exact payload that is sent to the model provider in the provider-specific way.

Request bodies are available via the `request.body` property of the response:

```ts highlight="6"
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello, world!',
});

console.log(result.request.body);
```


# Model Context Protocol (MCP) Tools

<Note type="warning">
  The MCP tools feature is experimental and may change in the future.
</Note>

The AI SDK supports connecting to [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers to access their tools.
This enables your AI applications to discover and use tools across various services through a standardized interface.

## Initializing an MCP Client

We recommend using HTTP transport (like `StreamableHTTPClientTransport`) for production deployments. The stdio transport should only be used for connecting to local servers as it cannot be deployed to production environments.

Create an MCP client using one of the following transport options:

- **HTTP transport (Recommended)**: Use transports from MCP's official TypeScript SDK like `StreamableHTTPClientTransport` for production deployments
- SSE (Server-Sent Events): An alternative HTTP-based transport
- `stdio`: For local development only. Uses standard input/output streams for local MCP servers

### HTTP Transport (Recommended)

For production deployments, we recommend using HTTP transports like `StreamableHTTPClientTransport` from MCP's official TypeScript SDK:

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL('https://your-server.com/mcp');
const mcpClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(url, {
    sessionId: 'session_123',
  }),
});
```

### SSE Transport

SSE provides an alternative HTTP-based transport option. Configure it with a `type` and `url` property:

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';

const mcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url: 'https://my-server.com/sse',

    // optional: configure HTTP headers, e.g. for authentication
    headers: {
      Authorization: 'Bearer my-api-key',
    },
  },
});
```

### Stdio Transport (Local Servers)

<Note type="warning">
  The stdio transport should only be used for local servers.
</Note>

The Stdio transport can be imported from either the MCP SDK or the AI SDK:

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// Or use the AI SDK's stdio transport:
// import { Experimental_StdioMCPTransport as StdioClientTransport } from 'ai/mcp-stdio';

const mcpClient = await createMCPClient({
  transport: new StdioClientTransport({
    command: 'node',
    args: ['src/stdio/dist/server.js'],
  }),
});
```

### Custom Transport

You can also bring your own transport by implementing the `MCPTransport` interface for specific requirements not covered by the standard transports.

<Note>
  The client returned by the `experimental_createMCPClient` function is a
  lightweight client intended for use in tool conversion. It currently does not
  support all features of the full MCP client, such as: authorization, session
  management, resumable streams, and receiving notifications.
</Note>

### Closing the MCP Client

After initialization, you should close the MCP client based on your usage pattern:

- For short-lived usage (e.g., single requests), close the client when the response is finished
- For long-running clients (e.g., command line apps), keep the client open but ensure it's closed when the application terminates

When streaming responses, you can close the client when the LLM response has finished. For example, when using `streamText`, you should use the `onFinish` callback:

```typescript
const mcpClient = await experimental_createMCPClient({
  // ...
});

const tools = await mcpClient.tools();

const result = await streamText({
  model: 'openai/gpt-4.1',
  tools,
  prompt: 'What is the weather in Brooklyn, New York?',
  onFinish: async () => {
    await mcpClient.close();
  },
});
```

When generating responses without streaming, you can use try/finally or cleanup functions in your framework:

```typescript
let mcpClient: MCPClient | undefined;

try {
  mcpClient = await experimental_createMCPClient({
    // ...
  });
} finally {
  await mcpClient?.close();
}
```

## Using MCP Tools

The client's `tools` method acts as an adapter between MCP tools and AI SDK tools. It supports two approaches for working with tool schemas:

### Schema Discovery

With schema discovery, all tools offered by the server are automatically listed, and input parameter types are inferred based on the schemas provided by the server:

```typescript
const tools = await mcpClient.tools();
```

This approach is simpler to implement and automatically stays in sync with server changes. However, you won't have TypeScript type safety during development, and all tools from the server will be loaded

### Schema Definition

For better type safety and control, you can define the tools and their input schemas explicitly in your client code:

```typescript
import { z } from 'zod';

const tools = await mcpClient.tools({
  schemas: {
    'get-data': {
      inputSchema: z.object({
        query: z.string().describe('The data query'),
        format: z.enum(['json', 'text']).optional(),
      }),
    },
    // For tools with zero inputs, you should use an empty object:
    'tool-with-no-args': {
      inputSchema: z.object({}),
    },
  },
});
```

This approach provides full TypeScript type safety and IDE autocompletion, letting you catch parameter mismatches during development. When you define `schemas`, the client only pulls the explicitly defined tools, keeping your application focused on the tools it needs

## Examples

You can see MCP tools in action in the following example:

<ExampleLinks
  examples={[
    {
      title: 'Learn to use MCP tools in Node.js',
      link: '/cookbook/node/mcp-tools',
    },
  ]}
/>
