# FlySwatter Keepalive (optional)

This directory documents how to deploy [supabase/flyswatter](https://github.com/supabase/flyswatter) to keep your Supabase project active via Fly.io.

FlySwatter is a Phoenix/Elixir app that pings URLs on a schedule. It is **not** an npm package — it runs as a separate Fly.io deployment.

## Simpler alternative (recommended)

Use the included GitHub Actions workflow instead:

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add secrets:
   - `SUPABASE_PROJECT_REF` — your project ref (from Supabase URL)
   - `SUPABASE_ANON_KEY` — your anon/public key
3. The workflow in `.github/workflows/supabase-keepalive.yml` runs daily automatically

## FlySwatter deployment (advanced)

If you prefer Fly.io over GitHub Actions:

```bash
git clone https://github.com/supabase/flyswatter.git
cd flyswatter
```

Add a stack in `lib/fly_swatter/stacks/` for your project:

```elixir
defmodule FlySwatter.Stacks.AheadTime do
  def stack do
    %FlySwatter.Stack{
      name: "aheadtime",
      endpoints: [
        "https://YOUR_PROJECT_REF.supabase.co/rest/v1/rpc/ping_keepalive"
      ],
      interval_ms: 60_000 * 60 * 6  # every 6 hours
    }
  end
end
```

Register it in `FlySwatter.PingerManager.init/1`, then deploy:

```bash
fly launch
fly deploy
```

See the [flyswatter README](https://github.com/supabase/flyswatter) for full setup including Logflare integration.

## Prerequisites

Apply the database migration first so `ping_keepalive()` and the `keepalive` table exist:

```
supabase/migrations/001_initial_schema.sql
```
