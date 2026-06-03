import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/register";
import { registerUser, createUserSession } from "../../lib/auth.server";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;

  // Basic validation checks
  if (!email || !password || !firstName || !lastName) {
    return { error: "All fields are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  // Write directly via our raw Postgres helper
  const result = await registerUser({ email, password, firstName, lastName });

  if ("error" in result) {
    return { error: result.error };
  }

  // Session token created and injected into state-free cookie wrapper
  return createUserSession(
    { id: result.id, email: result.email, role: result.role },
    "/"
  );
}

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Create your account
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

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                id="firstName"
                name="firstName"
                type="text"
                required
                autoComplete="given-name"
              />
              <Input
                label="Last Name"
                id="lastName"
                name="lastName"
                type="text"
                required
                autoComplete="family-name"
              />
            </div>

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
              autoComplete="new-password"
            />

            <Button type="submit" isLoading={isSubmitting}>
              Register
            </Button>
          </Form>

          <div className="mt-6 text-center">
            <Link to="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 underline">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}