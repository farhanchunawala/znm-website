# Deployment Guide for zollandmeter.com

This guide will help you deploy your Next.js application to Vercel and connect your custom domain.

## Prerequisites

-   GitHub account with access to `farhanchunawala/znm-website` repository
-   Domain registrar access for `zollandmeter.com`
-   Environment variables from your local `.env.local` file

## Step 1: Deploy to Vercel

### 1.1 Create Vercel Account & Import Project

1. Go to [vercel.com](https://vercel.com) and sign up/login with your GitHub account
2. Click **"Add New Project"**
3. Import the `farhanchunawala/znm-website` repository
4. Vercel will auto-detect Next.js settings (already configured in `vercel.json`)

### 1.2 Configure Environment Variables

Before deploying, add your environment variables:

1. In the Vercel project setup, scroll to **"Environment Variables"**
2. Add each variable from your `.env.local` file:

    - `MONGODB_URI` - Your MongoDB connection string
    - `NEXTAUTH_SECRET` - Your authentication secret
    - `NEXTAUTH_URL` - Set to `https://zollandmeter.com` (or Vercel URL initially)
    - `EMAIL_USER` - Your email for sending notifications
    - `EMAIL_PASS` - Your email password/app password
    - Any other variables from your `.env.local`

3. Click **"Deploy"**

### 1.3 Wait for Initial Deployment

-   Vercel will build and deploy your application
-   You'll get a URL like `znm-website.vercel.app`
-   Test this URL to ensure everything works

## Step 2: Connect Custom Domain

### 2.1 Add Domain in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings → Domains**
3. Add `zollandmeter.com` and `www.zollandmeter.com`
4. Vercel will provide DNS configuration instructions

### 2.2 Update DNS Records

Log into your domain registrar (where you bought zollandmeter.com) and update DNS records:

**For root domain (zollandmeter.com):**

-   Type: `A`
-   Name: `@`
-   Value: `76.76.21.21` (Vercel's IP)

**For www subdomain:**

-   Type: `CNAME`
-   Name: `www`
-   Value: `cname.vercel-dns.com`

**Alternative (if registrar supports ALIAS/ANAME):**

-   Type: `ALIAS` or `ANAME`
-   Name: `@`
-   Value: `cname.vercel-dns.com`

### 2.3 Wait for DNS Propagation

-   DNS changes can take up to 48 hours to propagate (usually much faster)
-   Vercel will automatically issue an SSL certificate once DNS is configured
-   You can check status in Vercel's Domains settings

## Step 3: Verify Deployment

1. **Test Vercel URL**: Visit your `znm-website.vercel.app` URL

    - Check homepage loads correctly
    - Test admin panel login
    - Verify database connections work
    - Check email functionality

2. **Test Custom Domain**: Once DNS propagates, visit `https://zollandmeter.com`
    - Ensure HTTPS is working (green lock icon)
    - Test all functionality again
    - Verify redirects work properly

## Automatic Deployments

Once set up, Vercel will automatically deploy:

-   **Production**: Every push to `main` branch → `zollandmeter.com`
-   **Preview**: Every pull request → temporary preview URL

## Troubleshooting

### Build Fails

-   Check Vercel build logs for errors
-   Ensure all environment variables are set
-   Verify `package.json` scripts are correct

### Domain Not Working

-   Verify DNS records are correct in your registrar
-   Use [DNS Checker](https://dnschecker.org) to verify propagation
-   Check Vercel Domains page for SSL certificate status

### Environment Variables Not Working

-   Ensure variables are added in Vercel dashboard
-   Redeploy after adding new variables
-   Check variable names match exactly (case-sensitive)

## Support

-   Vercel Documentation: https://vercel.com/docs
-   Next.js Deployment: https://nextjs.org/docs/deployment
-   Vercel Support: https://vercel.com/support
