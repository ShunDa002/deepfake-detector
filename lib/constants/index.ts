export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "GuessWho";
export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION || "An AI chatbot built with Next.js";
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
export const FASTAPI_BACKEND_URL =
  process.env.NEXT_PUBLIC_FASTAPI_BACKEND_URL ||
  process.env.FASTAPI_BACKEND_URL ||
  "https://shunda012-deepfake-fastapi.hf.space";

export const logInDefaultValues = {
  email: "",
  password: "",
};

export const signUpDefaultValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};
