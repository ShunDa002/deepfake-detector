"use server";

import { FASTAPI_BACKEND_URL } from "@/lib/constants";

type ModelType = "vit" | "siglip";

export async function detectImage(image: File, model: ModelType = "vit") {
  try {
    // Create FormData and append the file
    const formData = new FormData();
    formData.append("file", image);

    const baseUrl = process.env.FASTAPI_BACKEND_URL || FASTAPI_BACKEND_URL;

    // Choose endpoint based on selected model
    const endpointMap: Record<ModelType, string> = {
      vit: `${baseUrl}/vit-detect`,
      siglip: `${baseUrl}/siglip-detect`,
    };

    const endpoint = endpointMap[model];
    if (!endpoint) {
      throw new Error("Unsupported model selected");
    }

    // Make POST request to FastAPI endpoint
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it automatically with boundary
    });

    if (!response.ok) {
      throw new Error(`Detection failed: ${response.statusText}`);
    }

    // Parse and return the response
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error detecting image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
