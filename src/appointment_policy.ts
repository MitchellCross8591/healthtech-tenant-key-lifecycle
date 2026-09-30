import { z } from "zod";

export const appointmentEventSchema = z.object({
  tenantId: z.string().min(1),
  appointmentId: z.string().min(1),
  patientFirstName: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  status: z.enum(["scheduled", "rescheduled", "cancelled"])
});

export type AppointmentEvent = z.infer<typeof appointmentEventSchema>;

export type OperationalNotification = {
  appointmentId: string;
  audience: "patient";
  message: string;
};

export function notificationFor(event: AppointmentEvent): OperationalNotification {
  const when = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(event.startsAt));

  const action = event.status === "cancelled"
    ? "has been cancelled. Please contact the scheduling team if you need another time."
    : event.status === "rescheduled"
      ? `has moved to ${when}.`
      : `is scheduled for ${when}.`;

  return {
    appointmentId: event.appointmentId,
    audience: "patient",
    message: `Hi ${event.patientFirstName}, your appointment ${action}`
  };
}
