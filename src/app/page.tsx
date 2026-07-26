"use client";

import { useEffect, useRef, useState } from "react";
import {
  RealtimeAgent,
  RealtimeSession,
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

export default function Home() {
  const sessionRef = useRef<RealtimeSession | null>(null);

  const [status, setStatus] =
    useState<ConnectionStatus>("disconnected");

  const [isMuted, setIsMuted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  async function startConversation() {
    if (status === "connecting" || status === "connected") {
      return;
    }

    try {
      setStatus("connecting");
      setErrorMessage("");

      // Ask our secure backend for a temporary token.
      const tokenResponse = await fetch("/api/realtime-token", {
        method: "GET",
        cache: "no-store",
      });

      const tokenData =
        (await tokenResponse.json()) as TokenResponse;

      if (!tokenResponse.ok || !tokenData.clientSecret) {
        throw new Error(
          tokenData.error ??
            "The temporary voice token could not be created.",
        );
      }

      // Define the personality and purpose of our assistant.
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

          Do not pretend that you have checked live weather,
          drone restrictions or calendar information unless
          a tool has actually provided that information.
        `,
      });

      const session = new RealtimeSession(agent, {
        model: "gpt-realtime-2.1",
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
        console.error("Realtime session error:", error);
        setErrorMessage(
          "The voice session encountered an error.",
        );
      });

      // Connect using the temporary ek_ token.
      await session.connect({
        apiKey: tokenData.clientSecret,
      });

      sessionRef.current = session;
      setStatus("connected");
    } catch (error) {
      console.error("Voice connection failed:", error);

      const message =
        error instanceof Error
          ? error.message
          : "The voice connection failed.";

      setErrorMessage(message);
      setStatus("error");
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
  }

  // Close the microphone connection when leaving the page.
  useEffect(() => {
    return () => {
      sessionRef.current?.close();
    };
  }, []);

  function getStatusText() {
    if (status === "connecting") {
      return "Connecting to Kay Assistant...";
    }

    if (status === "connected" && isMuted) {
      return "Microphone muted";
    }

    if (status === "connected" && isAssistantSpeaking) {
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
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <div className="mb-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-neutral-400">
            Voice-first AI assistant
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Kay Assistant
          </h1>

          <p className="mt-4 leading-7 text-neutral-400">
            Your photography, videography, drone and
            productivity assistant.
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

            <p className="font-medium">{getStatusText()}</p>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-xl border border-neutral-600 px-5 py-3 font-semibold transition hover:bg-neutral-700"
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>

              <button
                type="button"
                onClick={stopConversation}
                className="rounded-xl bg-red-600 px-5 py-3 font-semibold transition hover:bg-red-500"
              >
                End conversation
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Your microphone is active only during a voice
          conversation.
        </p>
      </section>
    </main>
  );
}