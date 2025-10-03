Introducing type-safe chat and agentic loop control for full-stack AI applications
With over 2 million weekly downloads, the AI SDK is the leading open-source AI application toolkit for TypeScript and JavaScript. Its unified provider API allows you to use any language model and enables powerful integrations into leading web frameworks.
“When customers ask how they should build their agents, I always say the AI SDK. The industry is moving really fast and everything is changing constantly. The AI SDK is the only perfect abstraction I've seen so far. v5 continues that track record. You can tell it was built by people that are obsessed with Typescript. Everything feels right.When customers ask how they should build their agents, I always say the AI SDK. The industry is moving really fast and everything is changing constantly. The AI SDK is the only perfect abstraction I've seen so far. v5 continues that track record. You can tell it was built by people that are obsessed with Typescript. Everything feels right.”

Ben Hylak, raindrop.ai
Building applications with TypeScript means building applications for the web. Today, we are releasing AI SDK 5, the first AI framework with a fully typed and highly customizable chat integration for React, Svelte, Vue and Angular.
AI SDK 5 introduces:
Redesigned Chat
Agentic Loop Control
Speech Generation & Transcription
Tool Improvements
V2 Specifications
Global Provider
Access Raw Responses
Zod 4 Support
Let’s "dive" into the details.
Matt Pocock
Matt Pocock
@mattpocockuk
·
Follow
The AI SDK v5 is really, really good

- Cuts out a lot of crap
- Adds flexibility
- Tons more type-safety
- More LLM features
8:40 PM · Jul 7, 2025
418
Reply

Copy link
Link to headingRedesigned Chat
With AI SDK 5, we've rebuilt chat from the ground up. We took the powerful primitives that developers love for working with LLMs and built a world-class UI integration on top, with end-to-end type safety across your entire application. From server to the client, every piece of data, tool call, and metadata is fully typed. This represents the next evolution of AI libraries for the web.
Link to headingSeparate UI and Model Messages
Sami Hindi
Sami Hindi
@DevBySami
·
Follow
wasn’t expecting the new message system to make such a difference in @aisdk

separating UI and model messages cleans up so much front-end spaghetti

can actually read my own code now

not gonna miss the tangled chat logic
11:30 PM · Jul 29, 2025
10
Reply

Copy link
One of the biggest challenges developers faced with previous versions of the AI SDK was managing different message types and figuring out how to properly persist chat history.
This was a core consideration in rebuilding useChat, which led to the creation of distinct types of messages:
UIMessage: This is the source of truth for your application state, containing all messages, metadata, tool results, and more. We recommend using UIMessages for persisting so that you can always restore the correct user-facing chat history.
ModelMessage: This is a streamlined representation optimized for sending to language models.
We've made this distinction explicit in the API:

// Explicitly convert your UIMessages to ModelMessages
const uiMessages: UIMessage[] = [ /* ... */ ]
const modelMessages = convertToModelMessages(uiMessages);

const result = await streamText({
  model: openai('gpt-4o'),
  // Convert the rich UIMessage format to ModelMessage format
  // This can be replaced with any function that returns ModelMessage[]
  messages: modelMessages,
});

// When finished: Get the complete UIMessage array for persistence
return result.toUIMessageStreamResponse({
  originalMessages: uiMessages,
  onFinish: ({ messages, responseMessage }) => {
    // Save the complete UIMessage array - your full source of truth
    saveChat({ chatId, messages });
    
    // Or save just the response message
    saveMessage({ chatId, message: responseMessage })
  },
});
This separation between UI and model messages makes persistence straightforward. The onFinish callback provides all your messages in the format needed to save, with no explicit conversion required.
For complete examples of implementing message persistence with the AI SDK, check out our chatbot persistence documentation and the persistence template repository.
Link to headingCustomizable UI Messages
With AI SDK 5, you can customize the UIMessage to create your own type with the exact shape of your data, tools, and metadata, that is tailored to your application. You can pass this type as a generic argument to createUIMessageStream on the server and to useChat on the client, providing full-stack type-safety.

// Define your custom message type once
import { UIMessage } from 'ai';
// ... import your tool and data part types

export type MyUIMessage = UIMessage<MyMetadata, MyDataParts, MyTools>;

// Use it on the client
const { messages } = useChat<MyUIMessage>();

// And use it on the server
const stream = createUIMessageStream<MyUIMessage>(/* ... */);
To learn more, check out the UIMessage documentation.
Link to headingData Parts
Modern AI applications need to send more than just an LLM's plain-text response from the server to the client (e.g. anything from status updates to partial tool results). Without proper typing, streaming custom data can turn your frontend into a mess of runtime checks and type assertions. Data parts solve this by providing a first-class way to stream any arbitrary, type-safe data from the server to the client, ensuring your code remains maintainable as your application grows.
Josh tried coding
Josh tried coding
@joshtriedcoding
·
Follow
im very impressed with the ai-sdk v5

◆ fully type-safe server to client
◆ easy to stream custom data

demo coming very soon
Image
7:18 PM · Jul 30, 2025
135
Reply

Copy link
On the server, you can stream a data part by specifying your part type (e.g. data-weather) and then passing your data. You can update the same data part by specifying an ID:

// On the server, create a UIMessage stream
// Typing the stream with your custom message type
const stream = createUIMessageStream<MyUIMessage>({
  async execute({ writer }) {
    // manually write start step if no LLM call
    
    const dataPartId = 'weather-1';

    // 1. Send the initial loading state
    writer.write({
      type: 'data-weather', // type-checked against MyUIMessage
      id: dataPartId,
      data: { city: 'San Francisco', status: 'loading' },
    });

    // 2. Later, update the same part (same id) with the final result
    writer.write({
      type: 'data-weather',
      id: dataPartId,
      data: { city: 'San Francisco', weather: 'sunny', status: 'success' }, 
    });
  },
});
On the client, you can then render this specific part. When you use the same ID, the AI SDK replaces the existing data part with the new one:

// On the client, data parts are fully typed
const { messages } = useChat<MyUIMessage>();
{
  messages.map(message =>
    message.parts.map((part, index) => {
      switch (part.type) {
        case 'data-weather':
          return (
            <div key={index}>
              {/* TS knows part.data has city, status, and optional weather */}
              {part.data.status === 'loading'
                ? `Getting weather for ${part.data.city}...`
                : `Weather in ${part.data.city}: ${part.data.weather}`}
            </div>
          );
      }
    }),
  );
}
There are also instances where you want to send data that you do not want to persist, but use to communicate status updates, or make other changes to the UI - this is where transient data parts and the onData hook comes in.
Transient parts are sent to the client but not added to the message history. They are only accessible via the onData useChat handler:

// server
writer.write({
  type: 'data-notification',
  data: { message: 'Processing...', level: 'info' },
  transient: true, // Won't be added to message history
});

// client
const [notification, setNotification] = useState();
const { messages } = useChat({
  onData: ({ data, type }) => {
    if (type === 'data-notification') {
      setNotification({ message: data.message, level: data.level });
    }
  },
});
To learn more, check out the data parts documentation.
Link to headingType-Safe Tool Invocations
Tool invocations in useChat have been redesigned with type-specific part identifiers. Each tool now creates a part type like tool-TOOLNAME instead of using generic tool-invocation parts.
AI SDK 5 builds on this foundation with three improvements:
Type Safety: By defining your tools' shape within your custom message type, you get end-to-end type safety for both input (your tools' inputSchema) and output (your tools' outputSchema).
Automatic Input Streaming: Tool call inputs now stream by default, providing partial updates as the model generates them.
Explicit Error States: tool execution errors are limited to the tool and can be resubmitted to the LLM.
Together, these features enable you to build maintainable UIs that show users exactly what's happening throughout the tool execution process—from initial invocation through streaming updates to final results or errors:

// On the client, tool parts are fully typed with the new structure
const { messages } = useChat<MyUIMessage>();
{
  messages.map(message => (
    <>
      {message.parts.map(part => {
        switch (part.type) {
          // Static tools with specific (`tool-${toolName}`) types
          case 'tool-getWeather':
            // New states for streaming and error handling
            switch (part.state) {
              case 'input-streaming':
                // Automatically streamed partial inputs
                return <div>Getting weather for {part.input.location}...</div>;
              case 'input-available':
                return <div>Getting weather for {part.input.location}...</div>;
              case 'output-available':
                return <div>The weather is: {part.output}</div>;
              case 'output-error':
                // Explicit error state with information
                return <div>Error: {part.errorText}</div>;
            }
        }
      })}
    </>
  ));
}
The chat also supports dynamic tools (more below). Dynamic tools (e.g. tools from MCP server) are not known during development and can be rendered using the dynamic-tool part:

const { messages } = useChat<MyUIMessage>();
{
  messages.map(message => (
    <>
      {message.parts.map(part => {
        switch (part.type) {
          // Dynamic tools use generic `dynamic-tool` type
          case 'dynamic-tool':
            return (
              <div key={index}>
                <h4>Tool: {part.toolName}</h4>
                {part.state === 'input-streaming' && (
                  <pre>{JSON.stringify(part.input, null, 2)}</pre>
                )}
                {part.state === 'output-available' && (
                  <pre>{JSON.stringify(part.output, null, 2)}</pre>
                )}
                {part.state === 'output-error' && (
                  <div>Error: {part.errorText}</div>
                )}
              </div>
            );
        }
      })}
    </>
  ));
}
To learn more, see the dynamic tools section below or check out the tool calling documentation.
Link to headingMessage Metadata
For information about a message, such as a timestamp, model ID, or token count, you can now attach type-safe metadata to a message. You can use it to attach metadata that is relevant to your application.
To send metadata from the server:

// on the server
const result = streamText({
  /* ... */
});
return result.toUIMessageStreamResponse({
  messageMetadata: ({ part }) => {
    if (part.type === "start") {
      return {
        // This object is checked against your metadata type
        model: "gpt-4o",
      };
    }
    if (part.type === "finish") {
      return {
        model: part.response.modelId,
        totalTokens: part.totalUsage.totalTokens,
      };
    }
  },
});
You can then access it on the client:

// on the client
const { messages } = useChat<MyUIMessage>();
{
  messages.map(message => (
    <div key={message.id}>
      {/* TS knows message.metadata may have model and totalTokens */}
      {message.metadata?.model && (
        <span>Model: {message.metadata.model}</span>
      )}
      {message.metadata?.totalTokens && (
        <span>{message.metadata.totalTokens} tokens</span>
      )}
    </div>
  ));
}
As you update metadata values at different points in the message lifecycle, the client always displays the most current value.
To learn more, check out the message metadata documentation.
Link to headingModular Architecture & Extensibility
The new useChat hook has been redesigned with modularity at its core, enabling three powerful extensibility patterns:
Flexible Transports: Swap out the default fetch-based transport for custom implementations. Use WebSockets for real-time communication or connect directly to LLM providers without a backend for client-only applications, browser extensions, and privacy-focused use cases. To learn more, check out the transport documentation.
Decoupled State Management: The hook's state is fully decoupled, allowing seamless integration with external stores like Zustand, Redux, or MobX. Share chat state across your entire application while maintaining all of useChat's powerful features.
Framework-Agnostic Chat: Build your own chat hooks for any framework using the exposed AbstractChat class. Create custom integrations while maintaining full compatibility with the AI SDK ecosystem.
Link to headingVue, Svelte, and Angular Support
AI SDK 5 brings the redesigned chat experience to every major web framework. Vue and Svelte now have complete feature parity with React, and we've introduced support for Angular.
All frameworks now get the same powerful features: custom message types for your application's specific needs, data parts for streaming arbitrary typed data, fully typed tool invocations with automatic input streaming, and type-safe message metadata. Whether you're using useChat in React, Vue's composition API, Svelte's stores, or Angular's signals, you're working with the same powerful primitives and end-to-end type safety.
To learn more, check out the Vue, Svelte, and Angular example.
Link to headingSSE Streaming
The AI SDK now uses Server-Sent Events (SSE) as its standard for streaming data from the server to the client. SSE is natively supported in all major browsers and environments. This change makes our streaming protocol more robust, easier to debug with standard browser developer tools, and simpler to build upon.
Link to headingAgentic Loop Control
Sully
Sully
@SullyOmarr
·
Follow
man @aisdk v5 is so good, feels bad having to build agents without it

whats the equivalent or other languages (python etc)
11:25 PM · Jul 1, 2025
251
Reply

Copy link
Building reliable AI agents requires precise control over execution flow and context. With AI SDK 5, we're introducing primitives that give you complete control over how your agents run and what context and tools they have at each step.
AI SDK 5 introduces three features for building agents:
stopWhen: Define when a tool-calling loop is stopped.
prepareStep: Adjust the parameters for each step
Agent Abstraction: Use generateText and streamText with predefined settings
Link to headingstopWhen
When you make a request with the generateText and streamText, it runs for a single step by default. The stopWhen parameter transforms your single request into a tool-calling loop that will continue until:
The stopWhen condition is satisfied, or
The model generates text instead of a tool call (always a stopping condition)
Common stopping conditions include:
Step limit: stepCountIs(5) - run for up to 5 steps
Specific tool: hasToolCall('finalAnswer') - stop when a particular tool is called

import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, hasToolCall } from "ai";
const result = await generateText({
  model: openai("gpt-4o"),
  tools: {
    /* your tools */
  },
  // Stop a tool-calling loop after 5 steps or;
  // When weather tool is called
  stopWhen: [stepCountIs(5), hasToolCall("weather")],
});
Link to headingprepareStep
While stopWhen keeps your agent running, prepareStep allows you to control the settings for each step.
Before each step executes, you can adjust:
Messages: Compress or filter context to stay within limits or filter out irrelevant tokens.
Model: Switch between models based on task complexity.
System prompt: Adapt instructions for different tasks.
Tools: Enable/disable tools as needed.
Tool choice: Force specific tool usage (or none) when required.

const result = await streamText({
  model: openai('gpt-4o'),
  messages: convertToModelMessages(messages),
  tools: {
    /* Your tools */
  },
  prepareStep: async ({ stepNumber, messages }) => {
    if (stepNumber === 0) {
      return {
        // Use a different model for the first step
        model: openai('gpt-4o-mini'),
        // Force a specific tool choice
        toolChoice: { type: 'tool', toolName: 'analyzeIntent' },
      };
    }

    // Compress context for longer conversations
    if (messages.length > 10) {
      return {
        // use a model with a larger context window
        model: openai('gpt-4.1'),
        messages: messages.slice(-10),
      };
    }
  },
});
Link to headingAgent Abstraction
The Agent class provides an object-oriented approach to building agents. It doesn't add new capabilities - everything you can do with Agent can be done with generateText or streamText. Instead, it allows you to encapsulate your agent configuration and execution:

import { openai } from "@ai-sdk/openai";
import { Experimental_Agent as Agent, stepCountIs } from "ai";

const codingAgent = new Agent({
  model: openai("gpt-4o"),
  system: "You are a coding agent. You specialise in Next.js and TypeScript.",
  stopWhen: stepCountIs(10),
  tools: {
    /* Your tools */
  },
});

// Calls `generateText`
const result = codingAgent.generate({
  prompt: "Build an AI coding agent.",
});

// Calls `streamText`
const result = codingAgent.stream({
  prompt: "Build an AI coding agent.",
});
Link to headingExperimental Speech Generation & Transcription
AI SDK 5 extends our unified provider abstraction to speech. Just as we've done for text and image generation, we're bringing the same consistent, type-safe interface to both speech generation and transcription. Whether you're using OpenAI, ElevenLabs, or DeepGram, you work with the same familiar API pattern, and can switch providers with a single line change.

import {
  experimental_generateSpeech as generateSpeech,
  experimental_transcribe as transcribe,
} from 'ai';
import { openai } from '@ai-sdk/openai';

// Text-to-Speech: Generate audio from text
const { audio } = await generateSpeech({
  model: openai.speech('tts-1'),
  text: 'Hello, world!',
  voice: 'alloy',
});

// Speech-to-Text: Transcribe audio to text
const { text, segments } = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: await readFile('audio.mp3'),
});
To learn more, check out the speech and transcription documentation.
Link to headingTool Improvements
AI SDK 5 enhances tool capabilities with comprehensive improvements including dynamic tools, provider-executed functions, lifecycle hooks, and type-safety throughout the tool calling process.
Link to headingParameter & Result Renaming
In AI SDK 5, we've aligned our tool definition interface more closely with the Model Context Protocol (MCP) specification by renaming key concepts:
parameters → inputSchema: This rename better describes the schema's purpose of validating and typing the tool's input.
result → output: Similarly, tool outputs are now consistently named.
AI SDK 5 also introduces an optional outputSchema property, which aligns with the MCP specification and enables type-safety for client-side tool calling.
These changes make tool definitions more intuitive and consistent with emerging industry standards:

// Before (v4)
const weatherTool = tool({
  name: 'getWeather',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    return `Weather in ${location}: sunny, 72°F`;
  }
});

// After (v5)
const weatherTool = tool({
  description: 'Get the weather for a location',
  inputSchema: z.object({ location: z.string() }),
  outputSchema: z.string(), // New in v5 (optional)
  execute: async ({ location }) => {
    return `Weather in ${location}: sunny, 72°F`;
  }
});
Link to headingDynamic Tools
AI applications often need to work with tools that can't be known in advance:
MCP (Model Context Protocol) tools without schemas
User-defined functions loaded at runtime
External tool providers
Dynamic tools and the dynamicTool function enables tools where input and output types are determined at runtime rather than at development time. Dynamic tools are separated from static tools to give you type safety and flexibility at the same time.

import { dynamicTool } from 'ai';
import { z } from 'zod';

const customDynamicTool = dynamicTool({
  description: 'Execute a custom user-defined function',
  inputSchema: z.object({}),
  // input is typed as 'unknown'
  execute: async input => {
    const { action, parameters } = input as any;
    // Execute your dynamic logic
    return {
      result: `Executed ${action} with ${JSON.stringify(parameters)}`,
    };
  },
});

const weatherTool = tool({ /* ... */ })

const result = await generateText({
  model: 'openai/gpt-4o',
  tools: {
    // Static tool with known types
    weatherTool,
    // Dynamic tool
    customDynamicTool,
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
To learn more, check out the dynamic tool documentation.
Link to headingProvider-Executed Tools
Many AI providers have introduced provider-executed tools. When these tools are called, the provider will execute the tool and send back the tool result as part of the response (e.g. OpenAI’s web search and file search, xAI’s web search, and more).
The AI SDK now natively supports provider-executed tools, automatically appending the results to the message history without any additional configuration.

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const result = await generateText({
  model: openai.responses('gpt-4o-mini'),
  tools: {
    web_search_preview: openai.tools.webSearchPreview({}),
  },
  // ...
});
Link to headingTool Lifecycle Hooks
AI SDK 5 introduces granular tool lifecycle hooks (onInputStart, onInputDelta, onInputAvailable) that can be paired with data parts for sending input-related information (e.g. status updates) back to the client.

const weatherTool = tool({
  description: 'Get the weather for a given city',
  inputSchema: z.object({ city: z.string() }),
  onInputStart: ({ toolCallId }) => {
    console.log('Tool input streaming started:', toolCallId);
  },
  onInputDelta: ({ inputTextDelta, toolCallId }) => {
    console.log('Tool input delta:', inputTextDelta);
  },
  onInputAvailable: ({ input, toolCallId }) => {
    console.log('Tool input ready:', input);
  },
  execute: async ({ city }) => {
    return `Weather in ${city}: sunny, 72°F`;
  },
});
Link to headingTool Provider Options
AI SDK 5 adds support for tool-level provider options. You can use this to, for example, cache tool definitions with Anthropic for multi-step agents, reducing token usage, processing time, and costs:

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20240620'),
  tools: {
    cityAttractions: tool({
      inputSchema: z.object({ city: z.string() }),
      // Apply provider-specific options to individual tools
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      },
      execute: async ({ city }) => {
        // Implementation
      },
    }),
  },
});
Link to headingV2 Specifications
The foundation of the AI SDK is the specification layer, which standardizes how different language models, embeddings models, etc. plug into functions such as streamText . The specification layer enables the provider architecture of the AI SDK.
In AI SDK 5, we have updated all specifications to V2. These new specifications incorporate changes in the underlying API capabilities (like provider-executed tools) and have extensibility mechanisms such as provider metadata and options. They will serve as the foundation for AI SDK 5 and beyond.
To learn more about the V2 specifications, visit the custom provider documentation.
Link to headingGlobal Provider
The AI SDK 5 includes a global provider feature that allows you to specify a model using just a plain model ID string:

import { streamText } from 'ai';

const result = await streamText({
  model: 'openai/gpt-4o', // Uses the global provider (defaults to AI Gateway)
  prompt: 'Invent a new holiday and describe its traditions.',
});
By default, the global provider is set to the Vercel AI Gateway.
Alex Moore
Alex Moore
@ikindacode
·
Follow
Just tested the new @vercel AI Gateway with @aisdk. What a dang dream. You mean I just swap a string and boom, I'm using a different model? That's it? 😮‍💨
7:17 AM · Jul 13, 2025
34
Reply

Copy link
Link to headingCustomizing the Global Provider
You can set your own preferred global provider:

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Initialise once during startup:
globalThis.AI_SDK_DEFAULT_PROVIDER = openai;

// Somewhere else in your codebase:
const result = streamText({
  model: 'gpt-4o', // Uses OpenAI provider without prefix
  prompt: 'Invent a new holiday and describe its traditions.',
});
This simplifies provider usage and makes it easier to switch between providers without changing your model references throughout your codebase.
Link to headingAccess Raw Responses
When you need full control or want to implement new features before they're officially supported, the AI SDK provides complete access to raw request and response data. This escape hatch is invaluable for debugging, implementing provider-specific features, or handling edge cases.
Link to headingRaw Streaming Chunks
With AI SDK 5, you can access the raw chunks with streamed functions as they are received from your provider:

import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const result = streamText({
  model: openai("gpt-4o-mini"),
  prompt: "Invent a new holiday and describe its traditions.",
  includeRawChunks: true,
});

// Access raw chunks through fullStream
for await (const part of result.fullStream) {
  if (part.type === "raw") {
    // Access provider-specific data structures
    // e.g., OpenAI's choices, usage, etc.
    console.log("Raw chunk:", part.rawValue);
  }
}
Link to headingRequest and Response Bodies
You can also access the exact request sent to the provider and the full response received:

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Write a haiku about debugging",
});

// Access the raw request body sent to the provider
// See exact prompt formatting, parameters, etc.
console.log("Request:", result.request.body);

// Access the raw response body from the provider
// Full provider response including metadata
console.log("Response:", result.response.body);
Link to headingZod 4 Support
AI SDK 5 supports Zod 4. You can use either Zod 3 or the new Zod 4 mini schemas for input and output validation across all validation-enabled APIs.
We recommend using Zod 4 for new projects. Follow the recommendation on the Zod v4 docs.
Link to headingMigrating to AI SDK 5
Francisco Moretti
Francisco Moretti
@franmoretti_
·
Follow
AI SDK v5 is a masterpiece. Migration resulted in more typesafety, more control and flexibility, with less code
5:40 PM · Jul 9, 2025
12
Reply

Copy link
AI SDK 5 includes breaking changes that remove deprecated APIs. We've made the migration process easier with automated migration tools. You can run our automated codemods to handle some of the changes.

npx @ai-sdk/codemod upgrade
For a detailed overview of all changes and manual steps that might be needed, refer to our AI SDK 5 migration guide. The guide includes step-by-step instructions and examples to ensure a smooth update.