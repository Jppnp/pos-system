# Deployment Checklist

## GitHub Secrets Required

Before pushing to trigger automatic deployment, ensure these secrets are set in your GitHub repository:

### Required Secrets (Settings → Secrets and variables → Actions)

- [ ] **CLOUDFLARE_API_TOKEN**
  - Get from: https://dash.cloudflare.com/profile/api-tokens
  - Permissions: `Cloudflare Pages:Edit`

- [ ] **CLOUDFLARE_ACCOUNT_ID**
  - Get from: Cloudflare Dashboard sidebar
  - Format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

- [ ] **VITE_SUPABASE_URL**
  - Your Supabase project URL
  - Format: `https://xxxxx.supabase.co`

- [ ] **VITE_SUPABASE_ANON_KEY**
  - Your Supabase anonymous key
  - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Pre-Deployment Steps

- [ ] All tests pass: `npm run test`
- [ ] Environment variables validated: `npm run check-env`
- [ ] Code committed to main branch
- [ ] GitHub repository connected to Cloudflare Pages

## Post-Deployment Verification

- [ ] App loads at Cloudflare Pages URL
- [ ] PWA installation works
- [ ] Offline functionality works
- [ ] Authentication with Supabase works
- [ ] All features functional

## Cloudflare Pages Settings

If using manual deployment, use these settings:

- **Framework preset**: Vite
- **Build command**: `cd pos-system && npm run build`
- **Build output directory**: `pos-system/dist`
- **Root directory**: `/` (leave empty)

## Environment Variables in Cloudflare Pages

Set these in Cloudflare Pages Dashboard → Settings → Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Verify all secrets are set correctly
- Ensure Supabase credentials are valid

### App Doesn't Load
- Check Cloudflare Pages deployment logs
- Verify environment variables in Cloudflare dashboard
- Test locally with `npm run build && npm run preview`

### PWA Issues
- Ensure HTTPS is enabled
- Check service worker registration in DevTools
- Verify manifest.json is accessible