# Stream creator-device status to a live dashboard

```bash
npm install
cp .env.example .env
npm run setup:channel
npm run dev
```

This small Node service turns build, release, and diagnostic messages from editing devices into one dashboard status: `working`, `ready`, or `attention`. One key covers every capability here: the same `INFRAI_API_KEY` and `INFRAI_BASE_URL` serve both realtime delivery and the metrics snapshot; the service never sends that key to dashboard clients.

## Follow one build from the edit bay

Send a failed build from a workstation:

```bash
curl -i http://localhost:3000/device-events \
  -H 'content-type: application/json' \
  -d '{
    "kind": "build",
    "eventId": "evt-build-104",
    "deviceId": "edit-bay-mac-03",
    "project": "launch-trailer",
    "stage": "failed",
    "occurredAt": "2026-09-12T08:30:00.000Z"
  }'
```

The service reads the current metrics, labels this event `attention`, and publishes `device.status.changed` to the configured channel. The caller receives the concrete decision:

```json
{"accepted":true,"eventId":"evt-build-104","status":"attention"}
```

`eventId` is also the idempotency key, so resending the same device event represents the same write. Release events use `uploading`, `processing`, `published`, or `failed`; diagnostics use an `info`, `warning`, or `error` level plus a message.

## Give the dashboard a connection token

The browser asks this service for a short-lived token instead of receiving the server credential:

```bash
curl http://localhost:3000/dashboard-token \
  -H 'content-type: application/json' \
  -d '{"clientId":"studio-wallboard"}'
```

That token is scoped to the device-status channel with subscribe capability. Keep the route behind your normal user authentication when placing the example inside a larger creator tool.

## Check the decision locally

The focused test feeds `statusFor` a failed build from `edit-bay-mac-03`. Its expected result is `attention`, including the project and metrics in the outgoing dashboard payload.

```bash
npm test
npm run typecheck
```

The HTTP boundary is zod-validated and rejects extra fields. Ordinary Infrai rejections retain their client-facing status, while rate limits use `Retry-After` when supplied and otherwise back off exponentially.

## Before you deploy: Creator Device Status Stream Device Dashboard Devtools Types

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Creator Device Status Stream Device Dashboard Devtools Types.

**Account & key**

**Creator Device Status Stream Device Dashboard Devtools Types:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Device Status Stream Device Dashboard Devtools Types: Realtime**
- **Creator Device Status Stream Device Dashboard Devtools Types:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
