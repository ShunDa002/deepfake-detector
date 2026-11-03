"use server";

import { prisma } from "@/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { FASTAPI_BACKEND_URL } from "@/lib/constants";

// Check if user is logged in
export async function checkAuthStatus() {
  const session = await auth();
  return {
    isLoggedIn: !!session?.user?.id,
    userId: session?.user?.id || null,
  };
}

// Get all chat sessions for the logged-in user
export async function getUserSessions() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return { success: true, data: sessions };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch sessions",
    };
  }
}

// Create a new chat session
export async function createSession() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const newSession = await prisma.chatSession.create({
      data: {
        userId: session.user.id,
        title: "New Conversation",
      },
      include: {
        messages: true,
      },
    });

    revalidatePath("/chat");
    return { success: true, data: newSession };
  } catch (error) {
    console.error("Error creating session:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create session",
    };
  }
}

// Delete a chat session
export async function deleteSession(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify ownership before deleting
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!chatSession) {
      return { success: false, error: "Session not found" };
    }

    // Delete from frontend database
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    // Also delete from backend LangChain chat history
    try {
      const baseUrl = process.env.FASTAPI_BACKEND_URL || FASTAPI_BACKEND_URL;
      await fetch(`${baseUrl}/chat/${sessionId}`, {
        method: "DELETE",
      });
    } catch (backendError) {
      // Log but don't fail if backend delete fails
      console.error("Failed to delete backend chat history:", backendError);
    }

    revalidatePath("/chat");
    return { success: true };
  } catch (error) {
    console.error("Error deleting session:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete session",
    };
  }
}

// Update session title
export async function updateSessionTitle(sessionId: string, title: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
    });

    return { success: true, data: updatedSession };
  } catch (error) {
    console.error("Error updating session title:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update title",
    };
  }
}
