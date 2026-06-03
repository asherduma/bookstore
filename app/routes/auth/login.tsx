import { Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { login, createUserSession } from "../../lib/auth.server";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both an email and password." };
  }

  const user = await login({ email, password });

  if (!user) {
    return { error: "Invalid email or password configuration." };
  }

  // Sets signed state-free session payload redirecting to shop floor
  return createUserSession(user, "/");
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to Morari Books
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <Form method="post" className="space-y-6">
            {actionData?.error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-700">{actionData.error}</p>
              </div>
            )}

            <Input
              label="Email Address"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />

            <Button type="submit" isLoading={isSubmitting}>
              Sign In
            </Button>
          </Form>

          <div className="mt-6 text-center">
            <Link to="/auth/register" className="text-sm font-medium text-gray-600 hover:text-gray-900 underline">
              Don't have an account? Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}