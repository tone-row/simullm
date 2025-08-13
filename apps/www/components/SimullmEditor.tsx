"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface EditOperation {
  startLine: number;
  endLine: number;
  replacement: string;
  reasoning: string;
}

interface FileReplacement {
  content: string;
}

const INITIAL_CODE = `// Welcome to Simullm Code Editor!
// Describe what simulation you want to run and I'll help you write the code.
//
// Example prompts:
// - "Create a predator-prey ecosystem simulation"
// - "Build a market trading simulation with buyers and sellers"
// - "Make a simple counter simulation with multiple agents"
//
// I'll help you think through:
// - What global state you need
// - What agents are involved and their internal state
// - What message types agents use to communicate
// - How to start and end the simulation

// Your simulation code will appear here...`;

export function SimullmEditor() {
  const [currentCode, setCurrentCode] = useState<string>(INITIAL_CODE);
  const [input, setInput] = useState<string>("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),

    async onToolCall({ toolCall }) {
      console.log("Tool call received:", toolCall);
      if (toolCall.toolName === "editFile") {
        // During streaming, args might be incomplete, so wait for the complete tool call
        const data = (toolCall.args || toolCall.input) as
          | EditOperation
          | FileReplacement;
        console.log("Applying edit:", data);

        // Check if it's a full file replacement with 'content' field
        if (data && "content" in data && typeof data.content === "string") {
          console.log("Applying full file replacement");
          setCurrentCode(data.content);
        }
        // Otherwise check if it's a line-based edit
        else if (
          data &&
          "startLine" in data &&
          typeof data.startLine === "number" &&
          typeof data.endLine === "number" &&
          data.replacement
        ) {
          console.log("Applying line-based edit");
          applyEdit(data);
        } else {
          console.log("Tool call incomplete, waiting for more data...");
        }
      }
    },
    onFinish: (message) => {
      console.log("Message finished:", message);

      // Handle completed tool calls in AI SDK v5 format
      if (message.parts) {
        for (const part of message.parts) {
          if (part.type === "tool-editFile" && part.input) {
            const data = part.input as EditOperation | FileReplacement;
            console.log("Applying edit from finished message:", data);

            // Check if it's a full file replacement with 'content' field
            if (data && "content" in data && typeof data.content === "string") {
              console.log(
                "Applying full file replacement from finished message"
              );
              setCurrentCode(data.content);
            }
            // Otherwise check if it's a line-based edit
            else if (
              data &&
              "startLine" in data &&
              typeof data.startLine === "number" &&
              typeof data.endLine === "number" &&
              data.replacement
            ) {
              console.log("Applying line-based edit from finished message");
              applyEdit(data);
            }
          }
        }
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  console.log("Current messages:", messages);
  console.log("Status:", status);

  const applyEdit = (edit: EditOperation) => {
    const lines = currentCode.split("\n");

    // Convert to 0-based indexing
    const startIdx = edit.startLine - 1;
    const endIdx = edit.endLine - 1;

    // Validate line numbers
    if (startIdx < 0 || endIdx >= lines.length || startIdx > endIdx) {
      console.error("Invalid line numbers for edit:", edit);
      return;
    }

    // Apply the replacement
    const replacementLines = edit.replacement.split("\n");
    const newLines = [
      ...lines.slice(0, startIdx),
      ...replacementLines,
      ...lines.slice(endIdx + 1),
    ];

    setCurrentCode(newLines.join("\n"));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentCode);
  };

  const resetCode = () => {
    setCurrentCode(INITIAL_CODE);
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Chat */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Simullm Editor
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Chat with AI to modify your simullm library
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p>Ready to build your simulation!</p>
              <p className="text-sm mt-2">
                Try: &quot;Create a predator-prey ecosystem&quot; or &quot;Build
                a trading market simulation&quot;
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {message.parts.map((part: any, index: number) =>
                    part.type === "text" ? (
                      <span key={index}>{part.text}</span>
                    ) : null
                  )}
                </div>

                {/* Show tool calls */}
                {message.toolInvocations?.map((tool: any, idx: number) => (
                  <div
                    key={idx}
                    className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                  >
                    <div className="font-medium">
                      🔧 Tool Call: {tool.toolName}
                    </div>
                    {tool.args && (
                      <div className="text-xs mt-1">
                        Lines {tool.args.startLine}-{tool.args.endLine}:{" "}
                        {tool.args.reasoning}
                      </div>
                    )}
                    {tool.result && (
                      <div className="mt-1 p-1 bg-green-100 dark:bg-green-800 rounded text-xs">
                        ✅ {tool.result}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {status === "in_progress" && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    AI is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="flex space-x-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what simulation you want to create..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={status === "in_progress"}
            />
            <button
              type="submit"
              disabled={status === "in_progress"}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Right Panel - Code */}
      <div className="w-1/2 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            simullm.ts
          </h2>
          <div className="space-x-2">
            <button
              onClick={resetCode}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reset
            </button>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="flex-1 overflow-auto">
          <SyntaxHighlighter
            language="typescript"
            style={vscDarkPlus}
            showLineNumbers={true}
            lineNumberStyle={{
              minWidth: "3em",
              paddingRight: "1em",
              textAlign: "right",
              userSelect: "none",
              opacity: 0.6,
            }}
            customStyle={{
              margin: 0,
              padding: "1rem",
              fontSize: "0.875rem",
              height: "100%",
              background: "#1e1e1e",
            }}
            codeTagProps={{
              style: {
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              },
            }}
          >
            {currentCode}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
