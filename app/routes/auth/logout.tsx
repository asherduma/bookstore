import type { Route } from "./+types/logout";
import { destroySession } from "../../lib/session.server";
import { redirect } from "react-router";

// We only allow programmatic POST requests to prevent malicious link injection logs
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return destroySession(request);
}

export async function loader() {
  // If someone directly types /auth/logout, just boot them home
  return redirect("/");
}