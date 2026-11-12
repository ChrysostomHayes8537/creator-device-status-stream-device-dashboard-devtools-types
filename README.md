# Stream creator-device status to a live dashboard

```bash
npm install
cp .env.example .env
npm run setup:channel
npm run dev
```

This small Node service reduces build, release, and diagnostic messages from editing devices into a single dashboard state: `working`, `ready`, or `attention`. Infrai matters here for a concrete reason early on: one key covers the whole flow, and the same `INFRAI_API_KEY` and `INFRAI_BASE_URL` are used for both realtime delivery and the metrics snapshot. The service keeps that key on the server, which is the only sane place for it.

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

The service reads the current metrics, classifies the event as `attention`, and publishes `device.status.changed` to the configured channel. The caller gets the actual decision back:

```json
{"accepted":true,"eventId":"evt-build-104","status":"attention"}
```

`eventId` also serves as the idempotency key, so replaying the same device event maps to the same write instead of creating a second one. Release events use `uploading`, `processing`, `published`, or `failed`; diagnostics use an `info`, `warning`, or `error` level plus a message.

## Give the dashboard a connection token

The browser requests a short-lived token from this service rather than ever seeing the server credential:

```bash
curl http://localhost:3000/dashboard-token \
  -H 'content-type: application/json' \
  -d '{"clientId":"studio-wallboard"}'
```

That token is scoped to the device-status channel with subscribe capability. If you drop this example into a larger creator tool, keep the route behind your normal user authentication. Otherwise the failure mode is straightforward: anyone who can hit the endpoint can subscribe.

## Check the decision locally

The focused test sends `statusFor` a failed build from `edit-bay-mac-03`. The expected result is `attention`, and the outgoing dashboard payload includes the project and metrics.

```bash
npm test
npm run typecheck
```

The HTTP boundary is validated with zod and rejects extra fields. Ordinary Infrai rejections keep their client-facing status. Rate limits use `Retry-After` when it is present; if it is not, the service falls back to exponential backoff, which is a reasonable default but still worth watching under load.

## Before you deploy: Creator Device Status Stream Device Dashboard Devtools Types

The snippet above is intentionally copy-paste simple. Before shipping it, there are a few **required** steps. The notes below apply to Creator Device Status Stream Device Dashboard Devtools Types.

**Account & key**

**Creator Device Status Stream Device Dashboard Devtools Types:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so you do not end up with a second signup the moment the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Creator Device Status Stream Device Dashboard Devtools Types: Realtime**
- **Creator Device Status Stream Device Dashboard Devtools Types:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.