import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const provisionTenantSchema = z.object({
  tenantId: z.string().min(1),
  operatorEmail: z.string().email(),
  operatorName: z.string().min(1)
});

export const offboardTenantSchema = z.object({
  keyId: z.string().min(1),
  userId: z.string().min(1)
});

const userSchema = z.object({ id: z.string() });
const keySchema = z.object({ id: z.string(), key: z.string() });

export type ProvisionTenant = z.infer<typeof provisionTenantSchema>;
export type OffboardTenant = z.infer<typeof offboardTenantSchema>;

export async function provisionTenant(client: InfraiClient, input: ProvisionTenant) {
  const operationId = crypto.randomUUID();
  const user = userSchema.parse(await client.request<unknown>(
    "POST",
    "/v1/auth/user/create",
    {
      email: input.operatorEmail,
      name: input.operatorName,
      metadata: { tenant_id: input.tenantId },
      mode: "passwordless",
      idempotency_key: `${operationId}:user`
    }
  ));

  try {
    const credential = keySchema.parse(await client.request<unknown>(
      "POST",
      "/v1/account/keys/create",
      {
        project_id: input.tenantId,
        name: `${input.tenantId}-appointments`,
        scopes: ["appointments:read", "appointments:write"],
        idempotency_key: `${operationId}:key`
      }
    ));
    return { tenantId: input.tenantId, userId: user.id, keyId: credential.id, key: credential.key };
  } catch (error) {
    await client.request<unknown>("DELETE", `/v1/auth/user/delete/${encodeURIComponent(user.id)}`);
    throw error;
  }
}

export async function offboardTenant(client: InfraiClient, input: OffboardTenant) {
  await client.request<unknown>(
    "DELETE",
    `/v1/account/keys/revoke/${encodeURIComponent(input.keyId)}`
  );
  await client.request<unknown>(
    "DELETE",
    `/v1/auth/user/delete/${encodeURIComponent(input.userId)}`
  );
  return { state: "offboarded" as const, keyId: input.keyId, userId: input.userId };
}
