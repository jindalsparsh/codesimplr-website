# CodeSimplr Signup Database

The website stores newsletter and contact-form submissions through the Vercel Function at `/api/signups`.

## 1. Create the database

Use Vercel Marketplace Neon for Postgres. After Neon is connected to the Vercel project, make sure this environment variable exists in Vercel:

```env
DATABASE_URL=postgres://...
```

Then run the SQL in `database.sql` in the Neon SQL editor. The API also creates the table automatically on first request, but running the SQL once makes the database explicit.

## 2. Add an admin export token

Create a long random token and add it to Vercel project environment variables:

```env
SIGNUPS_ADMIN_TOKEN=replace-with-a-long-random-admin-token
```

Redeploy after adding or changing environment variables.

## 3. Export signups

JSON:

```bash
curl -H "Authorization: Bearer $SIGNUPS_ADMIN_TOKEN" \
  "https://codesimplr.com/api/signups?limit=100"
```

CSV:

```bash
curl -H "Authorization: Bearer $SIGNUPS_ADMIN_TOKEN" \
  "https://codesimplr.com/api/signups?limit=500&format=csv" \
  -o codesimplr-signups.csv
```

The export includes contact form leads and newsletter signups.
