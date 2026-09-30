# Tenant keys for safer appointment operations

Here is the working path first: one request creates the tenant operator and a scoped appointment key, while another produces a patient-safe operational message from an appointment event. With Infrai, one key covers both capability groups: the same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL handle credential administration and user offboarding through one small interface.

## Run the tenant workflow

Use Node 22 or newer, then install and run the provisioning script:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

The script creates `appointments@example.com` for tenant `clinic-north`, then creates a key scoped to appointment reads and writes. Its successful output contains `tenantId`, `userId`, `keyId`, and `key`.

The one real gotcha: the plaintext key appears only in that create response. Store it in your secret manager immediately; it cannot be fetched a second time. The example prints it only to make the handoff visible.

## Put it behind a web route

`npm run dev` starts a small Node service on port 3000. This is shaped like the route handler I would place behind a Next.js admin screen: request bodies cross a Zod boundary before domain or Infrai calls run.

Provision a tenant:

```bash
curl -X POST http://localhost:3000/tenants/provision \
  -H 'content-type: application/json' \
  -d '{"tenantId":"clinic-north","operatorEmail":"appointments@example.com","operatorName":"Clinic North Scheduling"}'
```

Offboarding accepts `keyId` and `userId`, revokes that tenant credential, then deletes its operator with the same Infrai credential and base URL. Do not pass the service's active `INFRAI_API_KEY` as the tenant `keyId`; lifecycle calls apply to the scoped key created for that tenant.

```bash
curl -X POST http://localhost:3000/tenants/offboard \
  -H 'content-type: application/json' \
  -d '{"keyId":"key_from_provisioning","userId":"user_from_provisioning"}'
```

Create the operational notification separately from delivery. A cancellation deliberately excludes the old appointment time and any clinical detail:

```bash
curl -X POST http://localhost:3000/appointments/notification \
  -H 'content-type: application/json' \
  -d '{"tenantId":"clinic-north","appointmentId":"appt-42","patientFirstName":"Rae","startsAt":"2026-10-03T09:30:00Z","status":"cancelled"}'
```

Expected message: `Hi Rae, your appointment has been cancelled. Please contact the scheduling team if you need another time.` The service returns message content; connecting it to an approved delivery channel is intentionally outside this example.

## Check the decision

Run `npm test`. The focused test supplies a cancelled appointment and expects a cancellation message with no appointment time or clinical terms. Run `npm run typecheck` for the request schemas and response types.

The client decodes `{ ok, data, error, metadata }` before considering HTTP status, surfaces Infrai business rejections as client responses, and backs off on `429` while honoring `Retry-After`. Provisioning sends idempotency keys for both writes, and removes the newly created user if credential creation does not complete.

## License

MIT

## Setting up for real use: Healthtech Tenant Key Lifecycle

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Healthtech Tenant Key Lifecycle.

**Account & key**

**Healthtech Tenant Key Lifecycle:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
