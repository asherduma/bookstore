import bcrypt from "bcryptjs";
import { redirect } from "react-router";
import { query } from "./db.server.js";
import { getSession, sessionStorage } from "./session.server.js";

interface UserSessionPayload {
  id: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}

/**
 * Validates credentials against raw database structures and builds a cookie session
 */
export async function login({ email, password }: Record<string, string>) {
  // Pure database optimization: only fetch exactly what we need for authentication
  const res = await query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1",
    [email]
  );
  
  const user = res.rows[0];
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  return { id: user.id, email: user.email, role: user.role };
}

/**
 * Creates a brand new user record using standard parametrized SQL variables
 */
export async function registerUser({ email, password, firstName, lastName }: Record<string, string>) {
  const passwordHash = await bcrypt.hash(password, 10);
  
  try {
    const res = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, 'CUSTOMER') 
       RETURNING id, email, role`,
      [email, passwordHash, firstName, lastName]
    );
    return res.rows[0];
  } catch (error: any) {
    // Catch unique constraint violations cleanly (Postgres error 23505)
    if (error.code === "23505") {
      return { error: "An account with this email address already exists." };
    }
    throw error;
  }
}

/**
 * Creates a committed cookie payload header for authentication tracking redirect responses
 */
export async function createUserSession(user: UserSessionPayload, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", user.id);
  session.set("userRole", user.role);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

/**
 * Enforces an active session check. If authenticated, returns basic session identifiers.
 */
export async function requireUser(request: Request) {
  const session = await getSession(request);
  const userId = session.get("userId");

  if (!userId) {
    throw redirect("/auth/login");
  }

  return {
    id: userId,
    role: session.get("userRole") as "CUSTOMER" | "ADMIN",
  };
}

/**
 * Enforces an explicit administrative role requirement boundary 
 */
export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  
  if (user.role !== "ADMIN") {
    throw redirect("/"); // Gracefully boot regular users to public space
  }
  
  return user;
}