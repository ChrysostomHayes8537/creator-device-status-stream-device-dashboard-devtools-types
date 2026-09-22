import { z } from "zod";

export const deviceEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("build"),
    eventId: z.string().min(1),
    deviceId: z.string().min(1),
    project: z.string().min(1),
    stage: z.enum(["queued", "compiling", "ready", "failed"]),
    occurredAt: z.string().datetime(),
  }).strict(),
  z.object({
    kind: z.literal("release"),
    eventId: z.string().min(1),
    deviceId: z.string().min(1),
    project: z.string().min(1),
    stage: z.enum(["uploading", "processing", "published", "failed"]),
    occurredAt: z.string().datetime(),
  }).strict(),
  z.object({
    kind: z.literal("diagnostic"),
    eventId: z.string().min(1),
    deviceId: z.string().min(1),
    project: z.string().min(1),
    level: z.enum(["info", "warning", "error"]),
    message: z.string().min(1).max(500),
    occurredAt: z.string().datetime(),
  }).strict(),
]);

export type DeviceEvent = z.infer<typeof deviceEventSchema>;
export type DashboardStatus = "working" | "ready" | "attention";

export function statusFor(event: DeviceEvent): DashboardStatus {
  if (event.kind === "diagnostic") return event.level === "info" ? "working" : "attention";
  if (event.stage === "failed") return "attention";
  if (event.stage === "ready" || event.stage === "published") return "ready";
  return "working";
}

export function dashboardPayload(event: DeviceEvent, metrics: unknown) {
  return {
    deviceId: event.deviceId,
    project: event.project,
    activity: event.kind,
    status: statusFor(event),
    occurredAt: event.occurredAt,
    metrics,
    ...(event.kind === "diagnostic" ? { diagnostic: { level: event.level, message: event.message } } : { stage: event.stage }),
  };
}
