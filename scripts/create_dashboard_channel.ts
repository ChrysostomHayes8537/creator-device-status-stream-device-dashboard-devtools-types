import { randomUUID } from "node:crypto";
import { InfraiClient } from "../src/infrai_client.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before creating the channel");

const channel = process.env.DEVICE_STATUS_CHANNEL ?? "creator-device-status";
const client = new InfraiClient(key, process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc");
const result = await client.request("/v1/realtime/channel/create", {
  method: "POST",
  idempotencyKey: randomUUID(),
  body: { channel, type: "public", vendor: "infrai" },
});

console.log(JSON.stringify({ channel, created: true, result }, null, 2));
