# Fondra — API

- Live API: `https://fondra-server.vercel.app/api`
- Client: <link to the deployed app> https://fondra-flame.vercel.app/ <link to the client repo>

## Stack

- Node.js / Express 5
- MongoDB Atlas + Mongoose
- JWT auth (`jsonwebtoken`, `bcryptjs`)
- Brevo (transactional email for verification codes)
- Cloudinary + Multer (avatars)
- ipwho.is (IP → city / country / lat / lng for the map)

## Getting started

```bash
npm install
npm run dev        # node --watch server.js
```

Create a `.env` in the project root:

```
PORT=8008
MONGODB_URI=mongodb://127.0.0.1:27017/fondra
TOKEN_SECRET=your-secret
ORIGIN=http://localhost:5173

CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=

BREVO_API_KEY=
MAIL_FROM=
MAIL_FROM_NAME=
```

`ORIGIN` is the client URL allowed by CORS. In production the same variables are set on Vercel.

## Models

| Model | Purpose |
|---|---|
| **User** | account, hashed password, email verification, invite code, avatar, IP-based location |
| **Connection** | `requester` → `recipient`, `pending` or `accepted` |
| **CheckIn** | one tap a day (max 5): mood, optional note / social energy / watch-out time |
| **Poke** | a nudge between two connected people; a poke back becomes a `gift` with a flower species |
| **GardenItem** | a planted gift: species, sender, `picked`, and its spot on the plot (`x`, `y` in 0–1) |
| **Notification** | who did what to whom, with `readAt` |

## API

Base URL: `https://fondra-server.vercel.app/api` — every route below is prefixed with `/api`.

**Auth column:** `public` = open · `token` = send `Authorization: Bearer <authToken>`.

Routes that take `localDate` expect the browser's own date as `DD.MM.YYYY` (e.g. `17.09.2026`) so daily limits stay correct across timezones.

### Auth & account

Accounts start unverified; a 6-digit code is emailed and the account is deleted automatically if it is still unverified after 24 hours.

| Method | Path | Auth | Body / query | What it does |
|---|---|---|---|---|
| GET | `/auth/invite/:code` | public | — | Previews who sent an invite link before signing up. 404 if the code is dead. |
| POST | `/auth/signup` | public | `username, email, password, name, inviteCode?` | Creates the account (unverified), hashes the password and mails a 6-digit code (10 min). An `inviteCode` is kept on the account until verification. Returns 201, no body. |
| POST | `/auth/verify-email` | public | `email, code` | Marks the email verified. If the account was created with an invite code, connects the two users and notifies the inviter. 400 on a wrong or expired code. |
| POST | `/auth/resend-code` | public | `email` | Issues a fresh 10-minute code when that email is still unverified. Always answers 200 with a generic message (400 without an email). |
| POST | `/auth/login` | public | `identifier, password` | Identifier is username or email. Returns `authToken` (JWT, 7 days) + `payload`. 400 on a wrong password; 403 while the email is unverified (the response includes the email so the client can offer a resend). |
| GET | `/auth/verify` | token | — | Confirms the token is still valid. Returns the payload. |
| GET | `/auth/location` | token | — | Resolves the caller's IP to city / country / lat / lng, saves it on the user and returns it. 502 when the lookup service fails. |
| GET | `/users/me` | token | — | The signed-in user's public profile. |
| PATCH | `/users/me` | token | `name` | Renames the account (trimmed, max 40). 400 on an empty name. |
| DELETE | `/users/delete-account` | token | — | Deletes the user and everything attached: check-ins, garden, pokes, connections, notifications, Cloudinary avatar. |

### Your circle

| Method | Path | Auth | Body / query | What it does |
|---|---|---|---|---|
| GET | `/connections/search` | token | `?q=` | Finds up to 10 people by username (partial) or exact email. Needs 2+ characters; never returns you. |
| POST | `/connections/request/:userId` | token | — | Sends a pending request and notifies them. 400 if it's yourself, 204 if the user doesn't exist, 409 if a link or request already exists. |
| GET | `/connections/requests` | token | — | Requests waiting on your answer. |
| GET | `/connections/sent` | token | — | Requests you sent that are still pending, newest first. |
| PUT | `/connections/:connectionId/accept` | token | — | Turns a pending request into an accepted one and notifies the sender. 204 if it's gone. |
| GET | `/connections` | token | `?localDate=` | Your whole circle with each person's latest check-in, plus poke state: `pokedAt`, `myPokeAt`, `pokesToday`. |
| DELETE | `/connections/:userId` | token | — | Withdraws, declines or removes — and clears any unanswered pokes between you. Flowers already received stay in the collection. |

### The daily loop

| Method | Path | Auth | Body / query | What it does |
|---|---|---|---|---|
| GET | `/checkins/today` | token | `?localDate=` | Today's count, the limit (5) and your last check-in. |
| POST | `/checkins` | token | `localDate, mood, note, social, watchOut, watchOutAt` | Logs a check-in (max 5 a day → 409), updates `lastCheckIn` and notifies your circle. `mood` and `social` must match the schema enums; `note` is cut to 140 chars; `watchOutAt` must be in the future. |
| PATCH | `/checkins/:checkInId` | token | `note, social` | Edits your own check-in and notifies the circle of the update. 404 if it isn't yours. |
| POST | `/pokes/:userId` | token | `localDate` | Nudges someone in your circle: 403 if you aren't connected, 409 past 5 a day to that person or inside the 1-hour cooldown. Poking back answers their poke and turns it into a gift with a random flower species. |
| GET | `/pokes/unplanted` | token | — | Gift pokes you've received but not yet planted, with sender details. |
| DELETE | `/pokes/:pokeId` | token | — | Throws an unplanted gift away. 404 once it's planted. |

### The garden

A poke is the seed: planting stamps `plantedAt` on the poke and the poke id is unique per flower, so the same poke can never be planted twice. The plot holds 15 picked flowers; the server picks well-spaced spots (`x`, `y` between 0 and 1).

| Method | Path | Auth | Body / query | What it does |
|---|---|---|---|---|
| GET | `/garden` | token | — | Everything in your collection, newest first, with the sender populated. |
| POST | `/garden/plant/:pokeId` | token | `x?, y?, picked?` | Turns a gift poke into a GardenItem that keeps `fromUser` and its species. Without coordinates the server picks a well-spaced spot. 404 if the poke is gone, 400 when the plot is full, 409 if already planted. |
| PUT | `/garden/:gardenItemId/picked` | token | `picked` (boolean) | Moves a flower in or out of the plot; picking re-rolls a free spot. 400 past 15 picked. |
| PUT | `/garden/:gardenItemId` | token | `x, y` (0–1) | Moves a flower to a new spot in the plot. 400 off the plot. |
| DELETE | `/garden/:gardenItemId` | token | — | Digs a flower up for good. |

### Avatar & notifications

| Method | Path | Auth | Body / query | What it does |
|---|---|---|---|---|
| POST | `/upload/avatar` | token | `multipart/form-data`, field `avatar` | Streams the image to Cloudinary (jpg / png / webp, max 3 MB, cropped to 256×256 on the face), deletes the previous one and saves the new URL on the user. 400 on a bad format or size. |
| DELETE | `/upload/avatar` | token | — | Clears the photo in Mongo and on Cloudinary — back to the initials fallback. |
| GET | `/notifications` | token | — | Your 10 newest notifications with the actor populated, plus the unread count (`readAt = null`). |
| PATCH | `/notifications/read` | token | — | Stamps `readAt` on everything unread. |
| GET | `/` | public | — | Health check at the server root (not under `/api`) — also wakes an idle server. |
