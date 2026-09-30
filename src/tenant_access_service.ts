import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { appointmentEventSchema, notificationFor } from "./appointment_policy.ts";
import { clientFromEnvironment, InfraiError } from "./infrai_client.ts";
import {
  offboardTenant,
  offboardTenantSchema,
  provisionTenant,
  provisionTenantSchema
} from "./tenant_key_workflow.ts";

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const client = clientFromEnvironment();
const server = createServer(async (request, response) => {
  try {
    if (request.method !== "POST") return send(response, 405, { error: "POST required" });
    const body = await readJson(request);
    if (request.url === "/tenants/provision") {
      return send(response, 201, await provisionTenant(client, provisionTenantSchema.parse(body)));
    }
    if (request.url === "/tenants/offboard") {
      return send(response, 200, await offboardTenant(client, offboardTenantSchema.parse(body)));
    }
    if (request.url === "/appointments/notification") {
      const event = appointmentEventSchema.parse(body);
      return send(response, 200, notificationFor(event));
    }
    return send(response, 404, { error: "Route not found" });
  } catch (error) {
    if (error instanceof ZodError) return send(response, 400, { error: "Invalid request", issues: error.issues });
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return send(response, status, { error: error.code });
    }
    console.error(error);
    return send(response, 500, { error: "Unexpected service error" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Tenant access service listening on http://localhost:${port}`));
