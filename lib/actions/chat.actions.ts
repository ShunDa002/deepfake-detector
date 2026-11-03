"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { FASTAPI_BACKEND_URL } from "@/lib/constants";

interface ChatResponse {
  response: {
    content: string;
  };
  session_id: string;
  response_time_seconds: number;
}

// Send a chat message - saves to database only if user is logged in
export async function sendChatMessage(
  query: string,
  sessionId: string,
): Promise<{ success: boolean; data?: ChatResponse; error?: string }> {
  try {
    const session = await auth();
    const isLoggedIn = !!session?.user?.id;

    // Check if session exists in database (only if logged in)
    let sessionExistsInDb = false;
    if (isLoggedIn) {
      const dbSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
      sessionExistsInDb = !!dbSession;
    }

    // Only save to database if user is logged in AND session exists in DB
    if (isLoggedIn && sessionExistsInDb) {
      // Save user message to database
      await prisma.chatMessage.create({
        data: {
          sessionId,
          content: query,
          sender: "user",
        },
      });

      // Update session title if first message
      const messageCount = await prisma.chatMessage.count({
        where: { sessionId },
      });

      if (messageCount === 1) {
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            title: query.slice(0, 30) + (query.length > 30 ? "..." : ""),
          },
        });
      }
    }

    // Call FastAPI backend
    // Pass save_to_db flag: true for logged-in users with DB session, false for guests
    const saveToDb = isLoggedIn && sessionExistsInDb;
    const baseUrl = process.env.FASTAPI_BACKEND_URL || FASTAPI_BACKEND_URL;
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        session_id: sessionId,
        save_to_db: saveToDb,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("API Error Response:", errorBody);
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorBody}`,
      );
    }

    const data: ChatResponse = await response.json();

    // Only save AI response to database if user is logged in AND session exists
    if (isLoggedIn && sessionExistsInDb) {
      await prisma.chatMessage.create({
        data: {
          sessionId,
          content: data.response.content,
          sender: "app",
        },
      });

      // Update session's updatedAt
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Chat API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}
