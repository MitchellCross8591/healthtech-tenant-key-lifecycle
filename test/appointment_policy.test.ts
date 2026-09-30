import assert from "node:assert/strict";
import test from "node:test";
import { notificationFor } from "../src/appointment_policy.ts";

test("a cancellation omits time and clinical details from the patient message", () => {
  const notification = notificationFor({
    tenantId: "clinic-north",
    appointmentId: "appt-42",
    patientFirstName: "Rae",
    startsAt: "2026-10-03T09:30:00Z",
    status: "cancelled"
  });

  assert.deepEqual(notification, {
    appointmentId: "appt-42",
    audience: "patient",
    message: "Hi Rae, your appointment has been cancelled. Please contact the scheduling team if you need another time."
  });
  assert.doesNotMatch(notification.message, /diagnosis|medication|procedure/i);
});
