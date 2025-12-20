# Dragon System Ship Checklist

## Preconditions
- `DATABASE_URL` set (local or staging DB)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- Valid Supabase access token for a test user

## Commands to Run
- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma generate`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run test`

## Smoke Test (Dragon System)

1) Get an access token (dev):
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
EMAIL=you@example.com
PASSWORD=...

node -e "const {createClient}=require('@supabase/supabase-js'); (async()=>{ const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); const {data,error}=await sb.auth.signInWithPassword({email:process.env.EMAIL,password:process.env.PASSWORD}); if(error) throw error; console.log(data.session.access_token); })().catch(e=>{console.error(e);process.exit(1)})"
```

2) Run the smoke test:
```bash
BASE_URL=http://localhost:3002
ACCESS_TOKEN=...
DATABASE_URL=...

node scripts/smoke-dragon-system.mjs
```

PASS looks like:
- `PASS: Dragon system smoke tests complete.`

If it fails:
- Script prints a single `FAIL:` message with the first failing assertion.

## Optional Cron

If you enable the auto-repair cron:
- Ensure `CRON_SECRET` is set in Vercel env vars.
- Vercel schedule is defined in `vercel.json` (daily at `0 7 * * *` UTC).
- Local hit:
```bash
CRON_SECRET=...
curl -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3002/api/cron/dragon-repair
```
- Prod hit:
```bash
CRON_SECRET=...
curl -H "Authorization: Bearer ${CRON_SECRET}" https://<your-domain>/api/cron/dragon-repair
```
