import assert from "node:assert/strict";
import test from "node:test";
import { dashboardPayload, deviceEventSchema, statusFor } from "../src/device_status.ts";

test("a failed creator build asks the dashboard for attention", () => {
  const event = deviceEventSchema.parse({
    kind: "build",
    eventId: "evt-build-104",
    deviceId: "edit-bay-mac-03",
    project: "launch-trailer",
    stage: "failed",
    occurredAt: "2026-09-12T08:30:00.000Z",
  });

  assert.equal(statusFor(event), "attention");
  assert.deepEqual(dashboardPayload(event, { cpu: 82 }), {
    deviceId: "edit-bay-mac-03",
    project: "launch-trailer",
    activity: "build",
    status: "attention",
    occurredAt: "2026-09-12T08:30:00.000Z",
    metrics: { cpu: 82 },
    stage: "failed",
  });
});
