import { NextResponse } from "next/server";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function registrationProxyError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("BACKEND_API_URL")) {
    return {
      status: 500,
      error: "Registration service is not configured.",
    };
  }

  return {
    status: 503,
    error: "Registration service is unavailable. Please make sure the backend API is running and try again.",
  };
}

export async function proxyRegistrationRequest(request: Request, backendPath: string) {
  try {
    const body = await request.json();
    const response = await fetch(`${requiredEnv("BACKEND_API_URL")}${backendPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const payload = registrationProxyError(error);
    return NextResponse.json({ error: payload.error }, { status: payload.status });
  }
}
