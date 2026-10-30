# Deploying the notification cron to n8n

The notification senders in `apps/cron/src` run on the n8n host (`workflows.familywealth.in`), not
with the API. n8n's "Execute Command" nodes run them from `/var/lib/n8n/notes-cron`, a flat copy of
`apps/cron/src`:

| n8n workflow | Schedule | Runs |
|---|---|---|
| Send Routine Notification | every minute | `send-notification.js`: the routine cues |
| Lifecycle Notifications | every 15 minutes | `lifecycle-notifications.js`: morning, evening and streak notices |
| Weekly agenda, update holidays | weekly / daily | `weekly-agenda.js`, `update-holidays.js` |

The host keeps what isn't in git: `.env` in `notes-cron/` and `serviceAccountKey.json` one level up.
`scripts/deploy-cron.sh` never writes either of them.

Merging to `develop` or `master` does **not** deploy this. Run the script after the commit is in.

## One-time setup

1. **SSH keys.** The script logs in with a key, never a password. There are two: `routine_vps` for
   deploys from a laptop and `routine_cron_ci` for GitHub Actions, so either can be revoked alone.
   Install both public keys on the host (`ssh` asks for the VPS password; type it yourself):

   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/routine_vps -N ""       # if you don't have them yet
   ssh-keygen -t ed25519 -f ~/.ssh/routine_cron_ci -N ""
   cat ~/.ssh/routine_vps.pub ~/.ssh/routine_cron_ci.pub | ssh root@workflows.familywealth.in "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
   ```

   Then pass `SSH_KEY=~/.ssh/routine_vps` to the script.
2. **n8n API key.** n8n → Settings → n8n API → create a key. Keep it out of the repo (the repo is
   public); export it as `N8N_API_KEY` in the shell that runs the deploy.
3. **The cron `.env`** on the host must set `MONGDO_DB`, `ENCRYPTION_KEY`, `OPENROUTER_API_KEY` and
   `WEB_APP_URL`. Cue copy tries the OpenRouter free tier first, then cheap Qwen (`CUE_PAID_MODELS`),
   then the template. Leave `OPENROUTER_FREE_MODELS` unset unless it names current `:free` models:
   the value pinned until 26 Oct 2026 was dead.

## Each deploy

```bash
# 1. Read-only: inspect the host, check the .env names, change nothing.
SSH_KEY=~/.ssh/routine_vps scripts/deploy-cron.sh --check

# 2. Deploy.
SSH_KEY=~/.ssh/routine_vps N8N_API_KEY=... VERIFY_EMAIL=<your account email> scripts/deploy-cron.sh
```

The deploy:

1. refuses uncommitted changes in `apps/cron` and runs its tests;
2. checks Node 18+ and the dependencies on the host, and that the `.env` names are set (it prints
   names only, never values);
3. backs up `notes-cron` to `notes-cron.bak-<time>`;
4. copies `apps/cron/src` over it and writes `RELEASE` (the commit that's live);
5. verifies with **dry runs only**, so nobody gets a push: `node --check` on every job,
   `preview-lifecycle.js <email>` and `send-cue-now.js <email> --dry-run`. If any of them fails, or a
   `mongodb://` URL appears in the output (D-11, which leaked the Mongo password to the n8n log), it
   restores the backup and stops;
6. in n8n, makes sure "Lifecycle Notifications" exists and is active (re-runs reuse it), and turns
   off the old 21:00 progress job.

Never run `send-notification.js` or `lifecycle-notifications.js` by hand to test: they send real
pushes. Use the dry runs above.

## GitHub Actions

`.github/workflows/deploy-cron.yml` runs the same script:

- **On every push to `master`** that touches `apps/cron`, the script, the lifecycle workflow JSON or
  the workflow file itself: a full deploy.
- **By hand** (Actions → Deploy Cron (n8n) → Run workflow, or
  `gh workflow run deploy-cron.yml --ref develop -f check_only=false`). `check_only` defaults to on,
  which only inspects the host.

It needs four repository secrets. The job checks them first and lists any that are missing:

| Secret | What |
|---|---|
| `CRON_SSH_KEY` | the private half of `routine_cron_ci` |
| `CRON_SSH_KNOWN_HOSTS` | `ssh-keyscan -t ed25519,rsa workflows.familywealth.in`, so the job only talks to that host |
| `N8N_API_KEY` | the n8n API key |
| `CRON_VERIFY_EMAIL` | the account the dry runs plan for |

Set one from a file so it never reaches your shell history:
`gh secret set N8N_API_KEY --repo familywealthIN/family-routine < ~/.ssh/n8n.key`.

## Rollback

The script prints the exact command at the end:

```bash
ssh root@workflows.familywealth.in "rm -rf /var/lib/n8n/notes-cron && mv /var/lib/n8n/notes-cron.bak-<time> /var/lib/n8n/notes-cron"
```

Then, in n8n, deactivate "Lifecycle Notifications" and re-activate the progress workflow if you want
the old behaviour back.
