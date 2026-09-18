# Privacy Facts

A nutrition label for your privacy. Paste a policy URL or its text to get plain-language answers, Jev confidence scores, and expandable source excerpts.

Built with vanilla JavaScript, Vite, Express, and [TypeSafe’s Jev](https://docs.typesafe.ai/introduction).

## Get started

Requires Node.js 22.12+ and a TypeSafe API key. From the project directory:

```sh
npm ci
cp .env.example .env
```

Set `TYPESAFE_API_KEY` in `.env`, then run:

```sh
npm run dev
```

Open [localhost:4317/privacy-facts/](http://localhost:4317/privacy-facts/). Restart the server after changing configuration.

| Variable | Default | Purpose |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | Required | Server-side TypeSafe API key |
| `TYPESAFE_MODEL` | `jev-latest` | Analysis model |
| `PORT` | `4317` | Local server port |

Never commit `.env` or expose the key through a `VITE_` variable.

## Reading the label

The label covers 14 questions about public AI training, opt-outs, product improvement, staff access, data sales, advertising, tracking, precise location, third-party uses, acquisition transfers, retention, and deletion requests.

Answers include **Yes**, **No**, **Only if you opt in**, **Sometimes**, **Not stated**, and **Not needed** where applicable. Retention uses duration and policy-rule buckets rather than yes/no answers.

- **Not stated:** the model found no explicit answer in the supplied policy.
- **Unclear:** the model’s classification confidence fell below 60%.
- **Percentages:** Jev’s model confidence—not a privacy score or guarantee of accuracy.
- **Colors:** depend on the question. A “No” to selling data is favorable; a “No” to deletion requests is not.

## How it works

The server fetches public HTML/plain text or accepts pasted text, extracts numbered sections, and asks Jev to classify each question. Separate questions select suggested supporting sections.

Excerpts are original policy text, not generated quotations. Their relevance is model-selected, not independently verified, and an excerpt may omit exceptions elsewhere. This analyzes policy statements, not actual company behavior.

The backend also classifies 12 ingredient/sharing categories returned by the API but currently not displayed in the label.

## Data handling and limitations

All text submitted for analysis is sent to TypeSafe. Avoid pasting confidential or personal information. The application does not persist analysis content or results; this does not describe TypeSafe’s or a hosting provider’s retention practices. Fonts load from Google Fonts.

URL submissions fetch a fresh copy. The reader does not execute website JavaScript or extract PDFs. Sites that block automated requests require manually pasted text.

Input limits:

- 60,000 text characters.
- 200 grouped sections.
- 4,000 characters per input paragraph.
- 2 MB per fetched page.

## Tests and production

```sh
npm test
npm run build
npm start
```

Production serves the built frontend and API at `/privacy-facts/`, bound to `127.0.0.1`. Deploy behind an HTTPS reverse proxy forwarding that path to the Node service. Static hosting alone cannot run the analysis API.

Before public hosting:

- Keep secrets server-side and API responses uncached.
- Monitor paid-API usage: neither backend imposes application-level rate or concurrency limits.
- Use production mode, not the Vite development server.

The Node fetcher rejects private/reserved addresses, checks redirects, and pins validated DNS addresses when connecting. Timeouts and input-size limits apply in both runtimes.

## Cloudflare Pages backend

The same frontend can run with Pages Functions instead of Express. Both adapters use shared extraction, Jev classification, and response formatting. No frontend URL switch is needed:

- `POST /privacy-facts/api/analyze` accepts `{ "url": "https://example.com/privacy" }` or `{ "text": "..." }`.
- `GET /privacy-facts/api/health` reports whether the API key is configured.

```sh
npm run build:pages
npm run check:pages
# Put TYPESAFE_API_KEY in a local .dev.vars file (gitignored).
npm run dev:pages
```

Open `http://localhost:8788/privacy-facts/`. The staged `.cloudflare-site` directory contains assets at the correct URL prefix; `functions/` contains the API routes. `wrangler.jsonc` is for this standalone project, not an existing personal-site deployment. Integration with another Pages project requires including the staged assets, function entrypoints, and their shared modules in that project's build.

For hosted Pages, configure `TYPESAFE_API_KEY` as a secret and optionally set `TYPESAFE_MODEL`. No account IDs or secrets are in the configuration. These commands build and preview locally; they do not deploy.

**Cloudflare fetch security:** arbitrary public hostnames are supported, with no approved-host list. Each redirect is checked and A/AAAA records are validated using Cloudflare DNS-over-HTTPS before fetching. No caller cookies or authorization headers are forwarded. However, Workers `fetch` resolves DNS again and cannot pin the checked address like the Node adapter. This leaves a DNS-rebinding check/use gap; do not treat it as equivalent SSRF protection or bind this fetch path to a private network. IP-literal URLs can also be rejected by the Workers runtime even when public. Pasting policy text remains available.

There is deliberately no application rate limiter. Provider/platform quotas still apply, and public requests consume the operator's TypeSafe credits. Deploy only with that cost exposure understood.

## Optional analysis analytics (Cloudflare)

Analytics is off by default. Operators can attach an Analytics Engine dataset
binding named `ANALYSIS_ANALYTICS` to enable one event per valid analysis
submission. Without that binding, the handler performs no analytics work.
The Node/Express adapter is unchanged and does not send these events.

Each event contains only a normalized public domain (or `pasted_text`), input
type (`url` or `text`), outcome (`success` or `failure`), and count of one.
Cloudflare adds a timestamp. Subdomains, paths, query strings, credentials,
policy text, results, raw errors, IP addresses, and visitor IDs are not included.
Private hosting tenants are grouped under their platform, e.g. `alice.github.io`
becomes `github.io`. IP literals and unknown suffixes are excluded. Domains can
still be sensitive; this is minimized telemetry, not guaranteed anonymity.

Counts represent submissions, not unique people. Invalid/oversized request bodies
are excluded; valid submissions that fail analysis count as failures. Analytics
errors never change the API response. Existing hosting logs and the policy text
sent to TypeSafe for analysis are separate from this optional instrumentation.

Configure dataset names and reporting in your deployment project, not in this
library. Keep preview and production datasets separate. Event schema:
`blob1=domain`, `blob2=input type`, `blob3=outcome`, `double1=1`;
the sampling index is the normalized domain, capped at 96 ASCII characters.
Use `SUM(_sample_interval * double1)` for sampling-weighted counts.
Analytics Engine retains events for three months and may sample them; it does
not store only daily counters. Tests mock the binding; verify ingestion on a
preview deployment before enabling production analytics.

See [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/#analytics-engine)
and [Analytics Engine limits](https://developers.cloudflare.com/analytics/analytics-engine/limits/).

## License

The project code is licensed under the [MIT License](LICENSE). Third-party assets retain their own licenses.

The lock icon is from [Twemoji](https://github.com/jdecked/twemoji), copyright Twitter, Inc. and other contributors, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The artwork is unmodified.

## Disclaimer

Made for funsies. AI can get things wrong. This is not legal advice; read the original policy before making decisions.
