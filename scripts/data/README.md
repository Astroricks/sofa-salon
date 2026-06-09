# Historical screening data

- `ziggygraph-screenings-zh.csv` — screening catalog export (date, Chinese title, director, etc.). Source for migration **37**. Replace with your own salon’s history or edit in place.
- **Letterboxd diary (bring your own)** — not shipped in this repo. Export your diary from [Letterboxd](https://letterboxd.com/settings/data/) (CSV), save it as:

  ```
  scripts/data/letterboxd-diary.csv
  ```

  That path is gitignored. Tag salon screenings in Letterboxd so the **Tags** column includes your salon tag (the matcher in `scripts/lib/match-letterboxd-en.mjs` looks for `ziggygraph` by default — change that string if you use a different tag). Rows supply English **Name** values, matched to sheet rows by **Watched Date** + release year in the Chinese title `（YYYY）`.

Regenerate SQL after editing the sheet CSV and/or adding your Letterboxd export:

```bash
node scripts/generate-historical-screenings-sql.mjs
```

Outputs:

| File | Purpose |
|------|---------|
| `supabase-sql/37-seed-historical-screenings-catalog.sql` | Sheet seed + patch empty names on existing same-night rows (see supabase-sql/README.md) |
| `historical-title-en-map.json` | Matched Chinese → English titles |
| `historical-title-en-unmatched.json` | Rows with no Letterboxd match (fill manually on site) |

Matching rules (see `scripts/lib/match-letterboxd-en.mjs`): same screening date + year; unique-year pairing on multi-film nights; ±1 **Watched Date** when no same-day match and exactly one unused tagged row on the adjacent day with the same release year.

### OMDb runtimes (`duration_minutes`)

For past rows missing `duration_minutes` (needs `OMDB_API_KEY` in `.env.local`):

```bash
node scripts/fetch-historical-durations-omdb.mjs --resume
```

Uses live DB rows (`screening_at < now()`, `duration_minutes IS NULL`) with `title_en` + `year`. Accepts **exact title** matches when catalog year is within **±2** of our row.

Writes:

| File | Purpose |
|------|---------|
| `historical-duration-omdb.json` | Full report |
| `historical-duration-omdb-review.json` | Rows still missing runtime |
| `historical-duration-omdb-approximations.json` | Exact title, year ±1/±2 |
| `../supabase-sql/41-patch-historical-duration-minutes.sql` | `UPDATE` only where duration is null |

Options: `--resume`, `--retry-omdb`, `--reverse`, `--apply`, `--limit=N`, `--source=csv`.

**Manual / LLM gaps** (e.g. Gemini): fill `title_en,year,duration_minutes` CSV, then:

```bash
node scripts/apply-manual-durations.mjs scripts/data/your-file.csv
```

Review `historical-duration-omdb-review.json` before running **41** in Supabase SQL Editor.
