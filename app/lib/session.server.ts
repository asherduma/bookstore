import { createCookieSessionStorage, redirect } from "react-router";

// A fallback secret for development. In production/benchmarking,
// you will provide this via your environment configuration variables.
const SESSION_SECRET = process.env.SESSION_SECRET || "default_minimalist_secret_key_32_chars";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__bookstore_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

/**
 * Extracts the user session profile from the request headers
 */
export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

/**
 * Terminates the current user session and clears the cookie context
 */
export async function destroySession(request: Request) {
  const session = await getSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}