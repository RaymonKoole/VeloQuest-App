import crypto from "crypto";

const secret = process.env.STRAVA_CLIENT_SECRET!;

export function createStravaState(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      timestamp: Date.now(),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyStravaState(state: string) {
  const [payload, signature] = state.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return null;
  }

  const data = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8")
  );

  // State maximaal 10 minuten geldig
  if (Date.now() - data.timestamp > 10 * 60 * 1000) {
    return null;
  }

  return data.userId as string;
}
