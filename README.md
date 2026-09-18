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
- Add edge-level abuse protection and paid-API spending controls.
- Configure limits for your proxy topology: the built-in limiter uses socket IPs, not forwarded headers, so proxied users may share a limit.
- Use production mode, not the Vite development server.

Built-in limits allow six attempts per minute per socket IP and four concurrent analyses per process; they are in-memory and not shared across instances. The fetcher rejects private/reserved addresses, checks redirects, and pins validated DNS addresses when connecting. These safeguards do not replace production security review.

## License

The project code is licensed under the [MIT License](LICENSE), copyright 2026 Tiger Wang. Third-party assets retain their own licenses.

The lock icon is from [Twemoji](https://github.com/jdecked/twemoji), copyright Twitter, Inc. and other contributors, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The artwork is unmodified.

## Disclaimer

Made for funsies. AI can get things wrong. This is not legal advice; read the original policy before making decisions.
