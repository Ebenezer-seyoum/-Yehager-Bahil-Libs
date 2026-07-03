import { proxyRegistrationRequest } from "../_proxy";

export async function POST(request: Request) {
  return proxyRegistrationRequest(request, "/api/v1/auth/register/verify");
}
