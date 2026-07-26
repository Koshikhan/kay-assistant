"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  RealtimeAgent,
  RealtimeSession,
  type RealtimeItem,
} from "@openai/agents/realtime";

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

type TokenResponse = {
  clientSecret?: string;
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  isComplete: boolean;
};

/**
 * Converts the Realtime SDK history into
 * messages that can be displayed in the interface.
 */
function convertHistoryToMessages(
  history: RealtimeItem[],
): ChatMessage[] {
  return history.flatMap((item) => {
    if (item.type !== "message") {
      return [];
    }

    if (
      item.role !== "user" &&
      item.role !== "assistant"
    ) {
      return [];
    }

    const text = item.content
      .map((part) => {
        if (
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        if (
          "transcript" in part &&
          typeof part.transcript === "string"
        ) {
          return part.transcript;
        }

        return "";
      })
      .join("")
      .trim();

    if (!text) {
      return [];
    }

    return [
      {
        id: item.itemId,
        role: item.role,
        text,
        isComplete: item.status === "completed",
      },
    ];
  });
}

export default function Home() {
  const sessionRef =
    useRef<RealtimeSession | null>(null);

  const transcriptEndRef =
    useRef<HTMLDivElement | null>(null);

  const [status, setStatus] =
    useState<ConnectionStatus>("disconnected");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [textInput, setTextInput] = useState("");

  const [isMuted, setIsMuted] = useState(false);

  const [
    isAssistantSpeaking,
    setIsAssistantSpeaking,
  ] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  /**
   * Scroll to the latest message whenever
   * the conversation changes.
   */
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /**
   * Close the Realtime session when
   * the user leaves the page.
   */
  useEffect(() => {
    return () => {
      sessionRef.current?.close();
    };
  }, []);

  async function startConversation() {
    if (
      status === "connecting" ||
      status === "connected"
    ) {
      return;
    }

    try {
      setStatus("connecting");
      setErrorMessage("");
      setMessages([]);
      setTextInput("");

      const tokenResponse = await fetch(
        "/api/realtime-token",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const tokenData =
        (await tokenResponse.json()) as TokenResponse;

      if (
        !tokenResponse.ok ||
        !tokenData.clientSecret
      ) {
        throw new Error(
          tokenData.error ??
            "The temporary voice token could not be created.",
        );
      }

      const agent = new RealtimeAgent({
        name: "Kay Assistant",

        instructions: `
          You are Kay Assistant, a friendly personal AI assistant.

          Your main areas are:
          - Photography
          - Videography
          - Drone filming
          - Content planning
          - Equipment organisation
          - Daily productivity

          Speak naturally and clearly.
          Keep spoken answers reasonably short.
          Ask one question at a time when clarification is needed.

          Do not pretend that you checked live weather,
          drone restrictions, maps or calendar information
          unless a tool actually provided that information.
        `,
      });

      const session = new RealtimeSession(agent, {
        model: "gpt-realtime-2.1",

        config: {
          outputModalities: ["audio"],

          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
              },

              turnDetection: {
                type: "semantic_vad",
                eagerness: "medium",
                createResponse: true,
                interruptResponse: true,
              },
            },
          },
        },
      });

      session.on("history_updated", (history) => {
        const updatedMessages =
          convertHistoryToMessages(history);

        setMessages(updatedMessages);
      });

      session.on("audio_start", () => {
        setIsAssistantSpeaking(true);
      });

      session.on("audio_stopped", () => {
        setIsAssistantSpeaking(false);
      });

      session.on("audio_interrupted", () => {
        setIsAssistantSpeaking(false);
      });

      session.on("error", (error) => {
        console.error(
          "Realtime session error:",
          error,
        );

        setErrorMessage(
          "The voice session encountered an error.",
        );
      });

      await session.connect({
        apiKey: tokenData.clientSecret,
      });

      sessionRef.current = session;
      setStatus("connected");
    } catch (error) {
      console.error(
        "Voice connection failed:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "The voice connection failed.";

      setErrorMessage(message);
      setStatus("error");
    }
  }

  function sendTypedMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message = textInput.trim();
    const session = sessionRef.current;

    if (
      !session ||
      status !== "connected" ||
      !message
    ) {
      return;
    }

    try {
      session.sendMessage(message);
      setTextInput("");
    } catch (error) {
      console.error(
        "Typed message failed:",
        error,
      );

      setErrorMessage(
        "Your typed message could not be sent.",
      );
    }
  }

  function toggleMute() {
    const session = sessionRef.current;

    if (!session) {
      return;
    }

    const nextMutedState = !isMuted;

    session.mute(nextMutedState);
    setIsMuted(nextMutedState);
  }

  function stopConversation() {
    sessionRef.current?.close();
    sessionRef.current = null;

    setStatus("disconnected");
    setIsMuted(false);
    setIsAssistantSpeaking(false);
    setErrorMessage("");
    setTextInput("");
  }

  function clearTranscript() {
    setMessages([]);
  }

  function getStatusText() {
    if (status === "connecting") {
      return "Connecting to Kay Assistant...";
    }

    if (status === "connected" && isMuted) {
      return "Microphone muted";
    }

    if (
      status === "connected" &&
      isAssistantSpeaking
    ) {
      return "Kay Assistant is speaking...";
    }

    if (status === "connected") {
      return "Listening — speak naturally";
    }

    if (status === "error") {
      return "Connection failed";
    }

    return "Ready to begin";
  }

  const isConnected = status === "connected";

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[360px_1fr]">
        {/* Assistant controls */}
        <section className="h-fit rounded-3xl border border-neutral-800 bg-neutral-900 p-7 shadow-2xl">
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-neutral-400">
              Voice-first AI assistant
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              Kay Assistant
            </h1>

            <p className="mt-4 leading-7 text-neutral-400">
              Your photography, videography, drone
              and productivity assistant.
            </p>
          </div>

          <div className="rounded-2xl bg-neutral-800 p-5">
            <div className="mb-5 flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  status === "connected"
                    ? "animate-pulse bg-green-500"
                    : status === "connecting"
                      ? "animate-pulse bg-yellow-500"
                      : status === "error"
                        ? "bg-red-500"
                        : "bg-neutral-500"
                }`}
              />

              <p className="font-medium">
                {getStatusText()}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            {!isConnected ? (
              <button
                type="button"
                onClick={startConversation}
                disabled={status === "connecting"}
                className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "connecting"
                  ? "Connecting..."
                  : "Start voice conversation"}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-full rounded-xl border border-neutral-600 px-5 py-3 font-semibold transition hover:bg-neutral-700"
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>

                <button
                  type="button"
                  onClick={stopConversation}
                  className="w-full rounded-xl bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-500"
                >
                  End conversation
                </button>
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-neutral-500">
            Your microphone is active only during
            a voice conversation.
          </p>
        </section>

        {/* Conversation transcript */}
        <section className="flex min-h-[600px] flex-col rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold">
                Live transcript
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Speak or type during the same
                conversation.
              </p>
            </div>

            {messages.length > 0 &&
              !isConnected && (
                <button
                  type="button"
                  onClick={clearTranscript}
                  className="rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                >
                  Clear
                </button>
              )}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[440px] items-center justify-center">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl">
                    🎙️
                  </div>

                  <p className="font-medium text-neutral-300">
                    No conversation yet
                  </p>

                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Start a conversation, then speak
                    naturally or type a message.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                      message.role === "user"
                        ? "bg-white text-black"
                        : "bg-neutral-800 text-white"
                    }`}
                  >
                    <p
                      className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
                        message.role === "user"
                          ? "text-neutral-500"
                          : "text-neutral-400"
                      }`}
                    >
                      {message.role === "user"
                        ? "You"
                        : "Kay"}
                    </p>

                    <p className="whitespace-pre-wrap leading-7">
                      {message.text}
                    </p>

                    {!message.isComplete && (
                      <span className="mt-2 inline-block animate-pulse text-xs opacity-50">
                        Transcribing...
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Typed-message form */}
          <form
            onSubmit={sendTypedMessage}
            className="border-t border-neutral-800 p-5"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={textInput}
                onChange={(event) =>
                  setTextInput(event.target.value)
                }
                disabled={!isConnected}
                placeholder={
                  isConnected
                    ? "Type a message to Kay..."
                    : "Start a conversation to type"
                }
                className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-white outline-none transition placeholder:text-neutral-500 focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  !isConnected ||
                  !textInput.trim()
                }
                className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              Switch between speaking and typing
              during the same conversation.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}