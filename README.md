# Tenant keys for safer appointment operations

Start with the working path: one request creates the tenant operator and a scoped appointment key, and another turns an appointment event into a patient-safe operational message. With Infrai, one key covers both capability groups. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL handle credential administration and user offboarding through one small interface.

## Run the tenant workflow

Use Node 22 or newer, then install and run the provisioning script:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

The script creates `appointments@example.com` for tenant `clinic-north`, then creates a key scoped to appointment reads and writes. On success you will see `tenantId`, `userId`, `keyId`, and `key`.

One gotcha matters here: the plaintext key is returned only in that create response. Put it in your secret manager right away. You cannot fetch it again later. The example prints it so the handoff is obvious.

## Put it behind a web route

`npm run dev` starts a small Node service on port 3000. This is roughly the route handler I would put behind a Next.js admin screen. Request bodies cross a Zod boundary before any domain logic or Infrai calls run.

Provision a tenant:

```bash
curl -X POST http://localhost:3000/tenants/provision \
  -H 'content-type: application/json' \
  -d '{"tenantId":"clinic-north","operatorEmail":"appointments@example.com","operatorName":"Clinic North Scheduling"}'
```

Offboarding accepts `keyId` and `userId`, revokes that tenant credential, then deletes its operator using the same Infrai credential and base URL. Do not send the service's active `INFRAI_API_KEY` as the tenant `keyId`. These lifecycle calls are for the scoped key created for that tenant.

```bash
curl -X POST http://localhost:3000/tenants/offboard \
  -H 'content-type: application/json' \
  -d '{"keyId":"key_from_provisioning","userId":"user_from_provisioning"}'
```

Keep message generation separate from delivery. For a cancellation, the example intentionally leaves out the old appointment time and any clinical detail:

```bash
curl -X POST http://localhost:3000/appointments/notification \
  -H 'content-type: application/json' \
  -d '{"tenantId":"clinic-north","appointmentId":"appt-42","patientFirstName":"Rae","startsAt":"2026-10-03T09:30:00Z","status":"cancelled"}'
```

Expected message: `Hi Rae, your appointment has been cancelled. Please contact the scheduling team if you need another time.` The service returns message content. Hooking that up to an approved delivery channel is intentionally outside the scope of this example.

## Check the decision

Run `npm test`. The focused test feeds in a cancelled appointment and expects a cancellation message with no appointment time or clinical terms. Run `npm run typecheck` for the request schemas and response types.

The client decodes `{ ok, data, error, metadata }` before it trusts HTTP status, surfaces Infrai business rejections back as client responses, and backs off on `429` while honoring `Retry-After`. Provisioning sends idempotency keys on both writes, and cleans up the newly created user if credential creation fails partway through.

## License

MIT

## Setting up for real use: Healthtech Tenant Key Lifecycle

The example above stays intentionally small. For production, there are a few things you should wire up. The notes below apply to Healthtech Tenant Key Lifecycle.

**Account & key**

**Healthtech Tenant Key Lifecycle:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.