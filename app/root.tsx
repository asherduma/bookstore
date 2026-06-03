import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { getSession } from "./lib/session.server";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";

// Crucial: Import the global CSS file containing your Tailwind directives
import "./app.css";

// Global font and asset styling injections
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  },
];

// Global server loader running on every document request
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  const userId = session.get("userId");
  const userRole = session.get("userRole");

  // If session keys exist, return them to the client shell layout
  if (userId && userRole) {
    return {
      user: {
        id: userId,
        role: userRole as "CUSTOMER" | "ADMIN",
        email: session.get("userEmail") || "user@morari.internal", 
      },
    };
  }

  return { user: null };
}

// Shell wrapper layout
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans antialiased text-gray-900 flex flex-col">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Main View Engine Root Entry Point
export default function App() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <>
      <Navbar user={user} />
      
      {/* Dynamic Content Target Area */}
      <main className="flex-grow mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Footer />
    </>
  );
}