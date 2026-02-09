# Cloudflare Turnstile Captcha Setup

(Written by Claude)

This document covers how Cloudflare Turnstile is integrated into the Stumpers experiment, how to set it up from scratch, and how to verify captcha tokens after data collection.

#### Summary Checklist

- [ ] Cloudflare account created
- [ ] Turnstile widget created with correct domains (production url + `localhost`)
- [ ] Site key added to `experiment.js` in the `turnstile.render()` call
- [ ] Secret key saved securely (not in the repo)
- [ ] Turnstile script loaded in `index.html` with `?render=explicit`
- [ ] Worker deployed (`cd worker && npx wrangler secret put TURNSTILE_SECRET && npx wrangler deploy`)
- [ ] `verifyWorkerUrl` set in `js/game_settings.js`

---

## How It Works in This Experiment

Turnstile is the **first thing participants see**, before the consent form. The flow is:

1. jsPsych starts and pushes `captcha_trial` as the first timeline item
2. The trial shows a fixed overlay (`#captcha-container`) with the Turnstile widget.
3. The Turnstile script is loaded asynchronously; a polling loop (`tryRender`) retries up to 50 times (5 seconds) until the `turnstile` global is available
4. On successful verification, Turnstile returns a token and the "Begin Study" button appears
5. Clicking the button hides the overlay, stores the token in the trial data (`captcha_token`), and advances the timeline to the consent form

The token is saved alongside all other jsPsych data via DataPipe and can be verified against the Cloudflare API after data collection.

### Key files

| File                     | Role                                                                             |
| ------------------------ | -------------------------------------------------------------------------------- |
| `index.html:24`          | Loads the Turnstile script with `?render=explicit` (manual rendering)            |
| `index.html:34-40`       | The `#captcha-container` overlay div with the widget target and proceed button   |
| `js/experiment.js:31-77` | The `captcha_trial` jsPsych trial that renders the widget and captures the token |
| `css/style.css:217-230`  | Styles for the fixed, centered captcha overlay                                   |

---

## Setting Up Cloudflare Turnstile

### 1. Create a Cloudflare account

Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and create a free account. Turnstile is free for unlimited use.

### 2. Add a Turnstile widget

1. In the Cloudflare dashboard, go to **Turnstile** in the left sidebar
2. Click **Add Widget**
3. Fill in:
   - **Widget name**: e.g., "Stumpers Adult Experiment"
   - **Domains**: Add every domain where the experiment will run. For example:
     - `yourusername.github.io` (GitHub Pages)
     - `localhost` (for local testing; `npx ` or `python3 -m http.server 8000 `)
   - **Widget Mode**: Choose **Managed** (Cloudflare decides whether to show a challenge)
4. Click **Create**

### 3. Copy your keys

After creating the widget, Cloudflare shows two keys:

| Key            | Where it goes                           | Visibility                             |
| -------------- | --------------------------------------- | -------------------------------------- |
| **Site Key**   | Client-side JavaScript (public)         | Safe to commit to your repo            |
| **Secret Key** | Server-side verification only (private) | **Never commit this.** Store securely. |

The site key looks like: `0x4AAAAAAB7QSd0CO5eotyUL`
The secret key looks like: `0x4AAAAAAAxxxxxxxxxxxxxxxxxxxxxxxx`

**Save the secret key somewhere secure** (e.g., a password manager or environment variable). You will need it later to verify tokens.

### 4. Add the site key to your code

In `js/experiment.js`, find the `turnstile.render` call inside `captcha_trial` and replace the `sitekey` value:

```javascript
turnstile.render("#turnstile-widget", {
  sitekey: "YOUR_SITE_KEY_HERE", // <-- paste your site key
  callback: function (token) {
    window.captchaToken = token;
    btn.style.display = "inline-block";
  },
  "error-callback": function () {
    widgetTarget.innerHTML =
      '<p style="color: #b22222;">Verification error. Please try reloading the page.</p>';
  },
});
```

### 5. Load the Turnstile script in your html

This is already in `index.html`. The `?render=explicit` parameter prevents auto-rendering so the widget only appears when `turnstile.render()` is called:

```html
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
  async
  defer
></script>
```

The `async defer` attributes allow the page to load without blocking on the script.

Next, make sure the `#captcha-container` div is present in `index.html` (it is by default) and styled to be a centered overlay. The jsPsych trial will show this container when it runs. This container is hidden by default (`display: none` in CSS) and shown by the jsPsych trial's `on_load` function.

```html
<div id="captcha-container">
  <h3>Security Verification</h3>
  <p>Please confirm you are human to begin.</p>
  <div id="turnstile-widget"></div>
  <br />
  <button id="captcha-proceed" style="display:none; padding: 10px 20px;">
    Begin Study
  </button>
</div>
```

---

## Testing Locally

Cloudflare provides test site keys that always pass or fail, useful for development:

| Key                        | Behavior                     |
| -------------------------- | ---------------------------- |
| `1x00000000000000000000AA` | Always passes                |
| `2x00000000000000000000AB` | Always blocks                |
| `3x00000000000000000000FF` | Forces interactive challenge |

To use a test key, temporarily replace the `sitekey` in `experiment.js`:

```javascript
sitekey: '1x00000000000000000000AA',  // always-pass test key
```

**Important:** `localhost` must be listed in your Turnstile widget's allowed domains for your real site key to work locally. The test keys work on any domain without configuration.

#### To spin up a local server:

Create a self-signed SSL certificate (Cloudflare requires HTTPS for Turnstile). Run this command in your terminal:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'
```

Next, start a server. You can either use Python's built-in HTTP server with SSL:

```bash
python3 -m http.server 8000 --bind
```

Or use `npx` with `http-server`:

```bash
npx http-server -p 8000 --ssl --cert cert.pem --key key.pem
```

---

## Real-Time Server-Side Verification (Cloudflare Worker)

A Cloudflare Worker in `worker/` handles server-side token verification in real time. When a participant completes the Turnstile challenge, the token is sent to the Worker, which calls Cloudflare's `/siteverify` endpoint and returns the result. The verification outcome (`server_verified`, `challenge_ts`, `verify_error_codes`) is saved in the captcha trial data alongside the token.

**Why realtime verification is necessary**

Turnstile tokens expire after 300 seconds (5 minutes). However, the `/siteverify` endpoint will still return metadata about the token (including whether it was valid at the time of issuance) even after expiry. Cloudflare's documentation states each token can only be validated once, so store the verification results.

The worker is defined in `worker/src/index.js`.

### Setup

1. **Install dependencies:**

   ```bash
   cd worker
   npm install
   ```

2. **Log in to Cloudflare:**

   ```bash
   npx wrangler login
   ```

3. **Add your Turnstile secret key:**

   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   ```

   TURNSTILE_SECRET is the name of the environment variable that your Worker code uses to access the secret key. When prompted, paste your secret key (from turnstile dashboard). This is stored securely in Cloudflare — it never appears in code or version control.

4. **Define the Worker:**

The Worker code in `worker/src/index.js` listens for POST requests containing the token, verifies it with Cloudflare's API, and returns the verification result. CORS headers are included to allow requests from your experiment domain.

5. **Deploy the Worker:**

   ```bash
   npx wrangler deploy
   ```

   This prints a URL like `https://stumpers-verify.<your-subdomain>.workers.dev`.

6. **Set the Worker URL in your experiment:**

   In `js/game_settings.js`, set `verifyWorkerUrl` to the deployed URL:

   ```javascript
   verifyWorkerUrl: "https://stumpers-verify.<your-subdomain>.workers.dev",
   ```

   To disable server-side verification (client-only mode), set this to `""`.

7. (optional) **Local development:**

   ```bash
   cd worker
   npx wrangler dev
   ```

   This runs the Worker locally at `http://localhost:8787`. Update `verifyWorkerUrl` to point there during testing.

### Data fields added by server-side verification

Server-side verification returns a **Response** with the following fields:

```json
{
  "success": true,
  "challenge_ts": "2025-01-15T12:00:00.000Z",
  "hostname": "yourusername.github.io",
  "error-codes": [],
  "action": "",
  "cdata": ""
}
```

In the experiment data, these are saved as:

| Field                | Description                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `server_verified`    | `true` if Cloudflare confirmed the token, `false` if rejected, `null` if the Worker was unreachable |
| `challenge_ts`       | Timestamp of the Turnstile challenge                                                                |
| `hostname`           | Hostname where the challenge was solved. Should be your experiment domain                           |
| `verify_error_codes` | Array of Cloudflare error codes (empty on success; see below)                                       |
| `verify_error`       | Error message if the Worker request itself failed (network error, etc.)                             |

#### Common error codes

| Error code               | Meaning                                         |
| ------------------------ | ----------------------------------------------- |
| `missing-input-secret`   | Secret key was not provided                     |
| `invalid-input-secret`   | Secret key is malformed or wrong                |
| `missing-input-response` | Token was not provided                          |
| `invalid-input-response` | Token is malformed or wrong                     |
| `bad-request`            | The request was malformed                       |
| `timeout-or-duplicate`   | Token has already been verified, or has expired |

### Graceful degradation

If `verifyWorkerUrl` is empty or the Worker is unreachable, the experiment still works — participants proceed normally and the token is saved in trial data. You can fall back to post-hoc verification if needed.

---

### Verifying Tokens After Data Collection (Fallback)

If you are not using the Worker, tokens can be verified against Cloudflare's `/siteverify` API using your **secret key** after downloading data from OSF.

**Note:** Turnstile tokens expire after 300 seconds (5 minutes). However, the `/siteverify` endpoint will still return metadata about the token (including whether it was valid at the time of issuance) even after expiry. Cloudflare's documentation states each token can only be validated once, so store the verification results.

Info: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
