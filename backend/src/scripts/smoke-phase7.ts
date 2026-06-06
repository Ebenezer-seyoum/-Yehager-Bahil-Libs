import { SignJWT } from "jose";

type CheckResult = {
  name: string;
  ok: boolean;
  details: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value.replace(/\/+$/, "");
}

async function runCheck(
  name: string,
  fn: () => Promise<{ ok: boolean; details: string }>,
): Promise<CheckResult> {
  try {
    const result = await fn();
    return { name, ...result };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return { name, ok: false, details };
  }
}

async function expectStatus(url: string, expected: number | number[]) {
  const list = Array.isArray(expected) ? expected : [expected];
  const res = await fetch(url, { method: "GET", redirect: "manual" });
  return {
    ok: list.includes(res.status),
    details: `${url} -> ${res.status} (expected ${list.join("/")})`,
  };
}

async function expectStatusWithAuth(url: string, expected: number | number[], token: string) {
  const list = Array.isArray(expected) ? expected : [expected];
  const res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return {
    ok: list.includes(res.status),
    details: `${url} -> ${res.status} (expected ${list.join("/")})`,
  };
}

async function getAdminSmokeToken() {
  const existing = process.env.ADMIN_SMOKE_TOKEN;
  if (existing) return existing;

  const secret = process.env.NEXTAUTH_SECRET;
  const issuer = process.env.AUTH_SHARED_JWT_ISSUER;
  const audience = process.env.AUTH_SHARED_JWT_AUDIENCE;
  const email = process.env.ADMIN_SMOKE_EMAIL ?? "admin@yehager.local";
  if (!secret || !issuer || !audience) return null;

  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    sub: email,
    email,
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
}

async function main() {
  const backendBase = requiredEnv("BACKEND_API_URL");
  const frontendBase = requiredEnv("FRONTEND_BASE_URL");

  const checks: CheckResult[] = await Promise.all([
    runCheck("backend_health", () => expectStatus(`${backendBase}/health`, 200)),
    runCheck("backend_readiness", () => expectStatus(`${backendBase}/health/ready`, [200, 503])),
    runCheck("backend_public_products", () => expectStatus(`${backendBase}/api/v1/products?limit=1`, 200)),
    runCheck("backend_protected_orders_requires_auth", () => expectStatus(`${backendBase}/api/v1/orders`, 401)),
    runCheck("frontend_home", () => expectStatus(`${frontendBase}/`, 200)),
    runCheck("frontend_catalog", () => expectStatus(`${frontendBase}/catalog`, 200)),
    runCheck("frontend_admin_requires_auth", () => expectStatus(`${frontendBase}/admin`, [302, 307, 308])),
  ]);

  const adminToken = await getAdminSmokeToken();
  if (!adminToken) {
    checks.push({
      name: "backend_admin_checks_skipped",
      ok: true,
      details: "Skipped: set ADMIN_SMOKE_TOKEN or NEXTAUTH_SECRET + AUTH_SHARED_JWT_ISSUER + AUTH_SHARED_JWT_AUDIENCE",
    });
  } else {
    const adminChecks = await Promise.all([
      runCheck("backend_admin_alerts", () => expectStatusWithAuth(`${backendBase}/api/v1/admin/alerts?limit=1`, 200, adminToken)),
      runCheck("backend_admin_audit", () => expectStatusWithAuth(`${backendBase}/api/v1/admin/audit?limit=1`, 200, adminToken)),
      runCheck("backend_admin_exchange_rate_refresh", async () => {
        const res = await fetch(`${backendBase}/api/v1/exchange-rate/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        return {
          ok: [200, 201].includes(res.status),
          details: `${backendBase}/api/v1/exchange-rate/refresh -> ${res.status} (expected 200/201)`,
        };
      }),
    ]);
    checks.push(...adminChecks);
  }

  const failed = checks.filter((c) => !c.ok);

  console.log("\nPhase 7 smoke check results:");
  for (const check of checks) {
    const symbol = check.ok ? "PASS" : "FAIL";
    console.log(`- [${symbol}] ${check.name}: ${check.details}`);
  }

  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll smoke checks passed.");
}

void main();
