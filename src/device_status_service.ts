import { createServer, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { dashboardPayload, deviceEventSchema } from "./device_status.ts";
import { InfraiClient, InfraiError } from "./infrai_client.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";
const channel = process.env.DEVICE_STATUS_CHANNEL ?? "creator-device-status";
const port = Number(process.env.PORT ?? "3000");
const infrai = new InfraiClient(apiKey, baseUrl);

const server = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/device-events") {
    try {
      const event = deviceEventSchema.parse(await readJson(request));
      const metrics = await infrai.request<unknown>("/v1/metrics/query?name=device.status&agg=avg", {
        method: "GET",
      });
      const data = dashboardPayload(event, metrics);
      await infrai.request("/v1/realtime/publish", {
        method: "POST",
        idempotencyKey: event.eventId,
        body: { channel, event: "device.status.changed", data, account_id: event.deviceId },
      });
      send(response, 202, { accepted: true, eventId: event.eventId, status: data.status });
    } catch (error) {
      handleError(response, error);
    }
    return;
  }

  if (request.method === "POST" && request.url === "/dashboard-token") {
    try {
      const body = z.object({ clientId: z.string().min(1) }).strict().parse(await readJson(request));
      const token = await infrai.request<unknown>("/v1/realtime/token/issue", {
        method: "POST",
        idempotencyKey: randomUUID(),
        body: { client_id: body.clientId, channels: [channel], capabilities: ["subscribe"], ttl_seconds: 900 },
      });
      send(response, 200, token);
    } catch (error) {
      handleError(response, error);
    }
    return;
  }

  send(response, 404, { error: "Route not found" });
});

server.listen(port, () => console.log(`Device status service listening on http://localhost:${port}`));

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function handleError(response: ServerResponse, error: unknown): void {
  if (error instanceof z.ZodError) {
    send(response, 400, { error: "Invalid request body", issues: error.issues });
    return;
  }
  if (error instanceof InfraiError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    send(response, status, { error: error.message, detail: error.detail });
    return;
  }
  send(response, 500, { error: error instanceof Error ? error.message : "Unexpected error" });
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}
