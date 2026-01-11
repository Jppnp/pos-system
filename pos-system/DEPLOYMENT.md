# Deployment Guide - POS System

## Cloudflare Pages Deployment

This guide covers deploying the POS System to Cloudflare Pages with PWA support.

### Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **GitHub Repository**: Code must be in a GitHub repository
3. **Supabase Project**: Set up your Supabase project for authentication and database

### Environment Variables

Set these environment variables in Cloudflare Pages dashboard:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Manual Deployment Setup

1. **Connect Repository**:
   - Go to Cloudflare Pages dashboard
   - Click "Create a project"
   - Connect your GitHub account
   - Select your repository

2. **Build Configuration**:
   - Framework preset: `None` (or `Vite`)
   - Build command: `cd pos-system && npm run build`
   - Build output directory: `pos-system/dist`
   - Root directory: `/` (leave empty)

3. **Environment Variables**:
   - Add the Supabase environment variables listed above
   - Go to Settings > Environment variables
   - Add variables for both Production and Preview environments

### Automated Deployment (GitHub Actions)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) for automated deployment.

#### Setup GitHub Secrets

Add these secrets to your GitHub repository:

1. **CLOUDFLARE_API_TOKEN**:
   - Go to Cloudflare dashboard > My Profile > API Tokens
   - Create token with "Cloudflare Pages:Edit" permissions
   - Add to GitHub repository secrets

2. **CLOUDFLARE_ACCOUNT_ID**:
   - Found in Cloudflare dashboard sidebar
   - Add to GitHub repository secrets

3. **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY**:
   - Your Supabase project credentials
   - Add to GitHub repository secrets

#### Workflow Features

- **Automatic deployment** on push to main/master branch
- **Preview deployments** for pull requests
- **Test execution** before deployment
- **Build optimization** with environment variables

### PWA Features

The deployment includes comprehensive PWA support:

#### Service Worker
- **Automatic updates**: New versions install automatically
- **Offline caching**: App works without internet connection
- **Asset caching**: Static files cached for performance
- **Runtime caching**: Google Fonts and images cached

#### Manifest Configuration
- **App installation**: Users can install as native app
- **Thai localization**: Full Thai language support
- **App shortcuts**: Quick access to main features
- **Proper icons**: SVG and PNG icons for all devices

#### Offline Strategy
- **Cache-first**: Static assets served from cache
- **Network-first**: API calls attempt network first
- **Fallback**: Graceful degradation when offline

### Custom Domain (Optional)

1. **Add Custom Domain**:
   - Go to Cloudflare Pages > Custom domains
   - Add your domain name
   - Update DNS records as instructed

2. **SSL Certificate**:
   - Automatically provisioned by Cloudflare
   - Force HTTPS redirect enabled

### Performance Optimization

The deployment includes several performance optimizations:

#### Caching Headers
- **Static assets**: 1 year cache with immutable flag
- **Service worker**: No cache to ensure updates
- **Manifest**: No cache to ensure latest version

#### Compression
- **Gzip/Brotli**: Automatic compression by Cloudflare
- **Asset optimization**: Vite build optimization
- **Tree shaking**: Unused code removal

### Monitoring and Analytics

#### Cloudflare Analytics
- **Page views**: Track application usage
- **Performance**: Monitor loading times
- **Geographic data**: See user locations

#### Error Tracking
- **Console logging**: Errors logged to browser console
- **Service worker logs**: PWA update and cache logs
- **Network monitoring**: Online/offline status tracking

### Troubleshooting

#### Common Issues

1. **Build Failures**:
   - Check environment variables are set correctly
   - Verify build command path: `cd pos-system && npm run build`
   - Check Node.js version compatibility

2. **PWA Not Installing**:
   - Ensure HTTPS is enabled
   - Check manifest.json is accessible
   - Verify service worker registration

3. **Offline Mode Issues**:
   - Check service worker is registered
   - Verify cache strategies in network tab
   - Test with DevTools offline mode

#### Debug Commands

```bash
# Local PWA testing
npm run build
npm run preview

# Check service worker
# Open DevTools > Application > Service Workers

# Test offline mode
# DevTools > Network > Offline checkbox
```

### Security Considerations

#### Headers Configuration
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **Referrer-Policy**: Control referrer information
- **Permissions-Policy**: Restrict browser features

#### Environment Variables
- **Never commit secrets**: Use environment variables only
- **Separate environments**: Different keys for production/preview
- **Regular rotation**: Update API keys periodically

### Maintenance

#### Regular Updates
- **Dependencies**: Keep npm packages updated
- **Cloudflare**: Monitor for platform updates
- **Supabase**: Check for database migrations

#### Backup Strategy
- **Database**: Regular Supabase backups
- **Code**: Git repository with tags for releases
- **Configuration**: Document all environment variables

This deployment setup provides a robust, scalable, and secure foundation for the POS System with full PWA capabilities and offline support.