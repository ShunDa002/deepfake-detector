"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import loader from "@/assets/loader.gif";
import { FASTAPI_BACKEND_URL } from "@/lib/constants";

export interface BackendWarmupOverlayProps {
  backendUrl?: string;
}

export function BackendWarmupOverlay({
  backendUrl = FASTAPI_BACKEND_URL,
}: BackendWarmupOverlayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  const targetUrl =
    backendUrl ||
    FASTAPI_BACKEND_URL ||
    "https://shunda012-deepfake-fastapi.hf.space";
  const cleanBaseUrl = targetUrl.replace(/\/+$/, "");
  const openApiEndpoint = `${cleanBaseUrl}/openapi.json`;

  // Prevent background scrolling while loading overlay is visible
  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLoading]);

  // Send request to /openapi.json to wake up backend when website is loaded
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function wakeUpBackend() {
      while (!isCancelled) {
        try {
          const response = await fetch(openApiEndpoint, {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          });

          if (response.ok) {
            await response.json().catch(() => ({}));
            if (!isCancelled) {
              setIsLoading(false);
              setTimeout(() => {
                if (!isCancelled) {
                  setIsVisible(false);
                }
              }, 300);
            }
            return;
          }
        } catch {
          if (isCancelled) {
            return;
          }
        }

        // Wait 2 seconds before retrying if space is starting up
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    wakeUpBackend();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [openApiEndpoint]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`fixed inset-0 z-[9999] bg-background transition-opacity duration-300 ${
        isLoading
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
      }}
    >
      <Image
        src={loader}
        alt="Loading..."
        width={100}
        height={100}
        unoptimized={true}
        priority
      />
    </div>
  );
}

export default BackendWarmupOverlay;
