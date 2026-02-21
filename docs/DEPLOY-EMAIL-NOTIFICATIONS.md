# Deploy Email Notifications (Edge Function)

To make sure the **send-notification-email** Edge Function is deployed and working:

## 1. Log in to Supabase CLI

```bash
supabase login
```

This opens a browser to get an access token. If you use CI, set `SUPABASE_ACCESS_TOKEN` instead.

## 2. Link your project (if not already)

From the project root:

```bash
cd /path/to/lifecycle-connector
supabase link --project-ref vnhwhyufevcixgelsujb
```

Use your database password when prompted.

## 3. Check what’s deployed

```bash
supabase functions list
```

If `send-notification-email` appears in the list, it’s already deployed.

## 4. Deploy the email function

```bash
supabase functions deploy send-notification-email
```

To deploy all functions:

```bash
supabase functions deploy
```

## 5. Set secrets (required for sending email)

In Supabase Dashboard: **Project Settings → Edge Functions → Secrets**, or via CLI:

```bash
# Get your API key from https://resend.com/api-keys
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Optional: override sender (default is DOO Command <hello@doo.ooo>)
supabase secrets set SENDER_EMAIL="Your App <noreply@yourdomain.com>"

# Optional: base URL for links in emails
supabase secrets set SITE_URL=https://your-app-url.com
```

## 6. Verify in the dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project **vnhwhyufevcixgelsujb**.
2. Open **Edge Functions** in the left sidebar.
3. Confirm **send-notification-email** is listed and has a “Deployed”/green status.
4. Open **Logs** for that function and trigger a notification (e.g. assign a mission); you should see invocations and any errors.

## Quick one-liner (after login + link)

```bash
supabase login && supabase link --project-ref vnhwhyufevcixgelsujb && supabase functions list && supabase functions deploy send-notification-email
```

Then set `RESEND_API_KEY` (and optionally `SENDER_EMAIL`, `SITE_URL`) as above.
