import { getPool } from "./db";

export type GurudwaraAccountRow = {
  id: string;
  email: string;
  password_hash: string;
  gurudwara_name: string;
  email_verified_at: Date | null;
  verification_token: string | null;
  verification_expires_at: Date | null;
  password_reset_token: string | null;
  password_reset_expires_at: Date | null;
};

export async function findAccountByEmail(email: string): Promise<GurudwaraAccountRow | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await getPool().query<GurudwaraAccountRow>(
    `SELECT * FROM gurudwara_accounts WHERE email = $1`,
    [normalized]
  );
  return rows[0] ?? null;
}

export async function findAccountByVerificationToken(
  token: string
): Promise<GurudwaraAccountRow | null> {
  const { rows } = await getPool().query<GurudwaraAccountRow>(
    `
      SELECT * FROM gurudwara_accounts
      WHERE verification_token = $1
        AND verification_expires_at > now()
    `,
    [token]
  );
  return rows[0] ?? null;
}

export async function findAccountByPasswordResetToken(
  token: string
): Promise<GurudwaraAccountRow | null> {
  const { rows } = await getPool().query<GurudwaraAccountRow>(
    `
      SELECT * FROM gurudwara_accounts
      WHERE password_reset_token = $1
        AND password_reset_expires_at > now()
    `,
    [token]
  );
  return rows[0] ?? null;
}

export async function insertGurudwaraAccount(input: {
  email: string;
  passwordHash: string;
  gurudwaraName: string;
  verificationToken: string;
  verificationExpiresAt: Date;
}): Promise<GurudwaraAccountRow> {
  const email = input.email.trim().toLowerCase();
  const { rows } = await getPool().query<GurudwaraAccountRow>(
    `
      INSERT INTO gurudwara_accounts (
        email,
        password_hash,
        gurudwara_name,
        verification_token,
        verification_expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [email, input.passwordHash, input.gurudwaraName.trim(), input.verificationToken, input.verificationExpiresAt]
  );
  return rows[0];
}

export async function markEmailVerified(userId: string): Promise<void> {
  await getPool().query(
    `
      UPDATE gurudwara_accounts
      SET email_verified_at = now(),
          verification_token = NULL,
          verification_expires_at = NULL,
          updated_at = now()
      WHERE id = $1::uuid
    `,
    [userId]
  );
}

export async function setPasswordResetToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  await getPool().query(
    `
      UPDATE gurudwara_accounts
      SET password_reset_token = $2,
          password_reset_expires_at = $3,
          updated_at = now()
      WHERE id = $1::uuid
    `,
    [userId, token, expiresAt]
  );
}

export async function updatePasswordAndClearReset(
  userId: string,
  passwordHash: string
): Promise<void> {
  await getPool().query(
    `
      UPDATE gurudwara_accounts
      SET password_hash = $2,
          password_reset_token = NULL,
          password_reset_expires_at = NULL,
          updated_at = now()
      WHERE id = $1::uuid
    `,
    [userId, passwordHash]
  );
}

export async function refreshVerificationToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  await getPool().query(
    `
      UPDATE gurudwara_accounts
      SET verification_token = $2,
          verification_expires_at = $3,
          updated_at = now()
      WHERE id = $1::uuid
    `,
    [userId, token, expiresAt]
  );
}
