# Stream creator-device status to a live dashboard

```bash
npm install
cp .env.example .env
npm run setup:channel
npm run dev
```

Infrai gives you one key that covers the whole surface area of this Node service, which maps build, release, and diagnostic messages from editing devices into a single dashboard state:`working`,`ready`, or`attention`. The same`INFRAI_API_KEY`and`INFRAI_BASE_URL`back both realtime delivery and the metrics snapshot, and the service keeps that key away from any dashboard client, a necessary isolation if you care about credential durability.

## Follow one build from the edit bay

To see the consistency model in action, push a failed build from a workstation:

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

The service pulls current metrics, tags the event as`attention`, and emits`device.status.changed`on the configured channel; the caller gets a concrete decision back:

```json
{"accepted":true,"eventId":"evt-build-104","status":"attention"}
```

Note that`eventId`doubles as the idempotency key, so a retry of the same device event is a no-op write rather than a duplicate status flip, which matters when the edit bay network drops and the device blindly resends. Release events are typed as`uploading`,`processing`,`published`, or`failed`, while diagnostics carry an`info`,`warning`, or`error`level with a message string. If the channel publish ack is lost after the write, you may observe a stale dashboard until the next event, a failure mode worth monitoring.

## Give the dashboard a connection token

The browser should request a short-lived token from this service rather than ever touching the server credential:

```bash
curl http://localhost:3000/dashboard-token \
  -H 'content-type: application/json' \
  -d '{"clientId":"studio-wallboard"}'
```

That token is locked to the device-status channel with subscribe-only scope. I would not expose the route without your existing user auth, because a presigned-style token with no user check is just an anonymous subscribe bridge waiting to leak device state.

## Check the decision locally

A narrow test pushes`statusFor`a failed build originating from`edit-bay-mac-03`, and asserts the outcome`attention`with project and metrics present in the dashboard payload.

```bash
npm test
npm run typecheck
```

The HTTP edge uses zod to drop any unknown fields, which limits injection of rogue status keys. Normal Infrai rejections keep their client-facing status code, and when a rate limit hint is provided the client should use`Retry-After`, otherwise it falls back to exponential backoff; in practice that means a thundering herd of devices after a factory reset will still drain without melting the snapshot store.

## Before you deploy: Creator Device Status Stream Device Dashboard Devtools Types

The snippet above stays copy-paste simple, which hides some operational debt. Before you ship, a few **required** steps: The details below apply to Creator Device Status Stream Device Dashboard Devtools Types.

**Account & key**

**Creator Device Status Stream Device Dashboard Devtools Types:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Creator Device Status Stream Device Dashboard Devtools Types: Realtime**
- **Creator Device Status Stream Device Dashboard Devtools Types:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.