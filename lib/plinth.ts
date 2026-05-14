import { fetchWithTimeout } from "./http";
import { getAuthProductName } from "./auth-product";

const PLINTH_CALL_URL = "https://plinth.tools/api/v1/call";
const PLINTH_TIMEOUT_MS = 25_000;

type PlinthEnvelope = {
  ok?: boolean;
  error?: { code?: string; message?: string };
  result?: unknown;
};

export class PlinthError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "PlinthError";
  }
}

export async function plinthCall<T = unknown>(
  name: string,
  arguments_: Record<string, unknown>
): Promise<T> {
  const apiKey = process.env.PLINTH_API_KEY?.trim();
  if (!apiKey) {
    throw new PlinthError("Email is not configured (missing PLINTH_API_KEY).");
  }

  const response = await fetchWithTimeout(
    PLINTH_CALL_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, arguments: arguments_ })
    },
    PLINTH_TIMEOUT_MS
  );

  const body = (await response.json().catch(() => ({}))) as PlinthEnvelope;

  if (!response.ok) {
    const msg = body.error?.message || `Plinth request failed (${response.status})`;
    throw new PlinthError(msg, body.error?.code);
  }

  if (body.error?.message) {
    throw new PlinthError(body.error.message, body.error.code);
  }

  return (body.result !== undefined ? body.result : body) as T;
}

export async function sendTemplateEmail(args: {
  to: string;
  templateKey: string;
  variables: Record<string, string | number | boolean | null>;
}) {
  await plinthCall("emails.send_template", {
    to: args.to,
    templateKey: args.templateKey,
    variables: args.variables
  });
}

export async function sendEmailVerificationLink(to: string, firstName: string, verifyUrl: string) {
  await sendTemplateEmail({
    to,
    templateKey: "email_verification_link",
    variables: {
      productName: getAuthProductName(),
      firstName,
      ctaUrl: verifyUrl,
      expiresInMinutes: 60 * 48
    }
  });
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string,
  requestIp: string
) {
  await sendTemplateEmail({
    to,
    templateKey: "password_reset",
    variables: {
      productName: getAuthProductName(),
      firstName,
      ctaUrl: resetUrl,
      expiresInMinutes: 60,
      requestIp
    }
  });
}

export async function sendWelcomeEmail(to: string, firstName: string, dashboardUrl: string) {
  await sendTemplateEmail({
    to,
    templateKey: "welcome",
    variables: {
      productName: getAuthProductName(),
      firstName,
      ctaUrl: dashboardUrl
    }
  });
}
