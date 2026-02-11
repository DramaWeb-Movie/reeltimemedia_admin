# Database & Storage Setup Guide

## Supabase Setup

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note down your project URL and API keys

2. **Configure Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```

3. **Set Up Database Schema**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL commands from `lib/database/schema.sql`
   - This will create the necessary tables: movies, user_profiles, payments

4. **Enable Row Level Security (RLS)**
   - Configure RLS policies in Supabase Dashboard → Authentication → Policies
   - Set up policies for admin access to all tables

## Cloudflare R2 Setup

1. **Create R2 Bucket**
   - Go to Cloudflare Dashboard → R2
   - Create a new bucket for your media files
   - Note down your bucket name

2. **Create API Token**
   - Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
   - Create a new API token with read/write permissions
   - Note down: Account ID, Access Key ID, Secret Access Key

3. **Get R2 Endpoint**
   - Your R2 endpoint will be: `https://<account-id>.r2.cloudflarestorage.com`
   - Or use custom domain if configured

4. **Configure Environment Variables**
   - Fill in your R2 credentials in `.env.local`:
     ```
     R2_ACCOUNT_ID=your-account-id
     R2_ACCESS_KEY_ID=your-access-key-id
     R2_SECRET_ACCESS_KEY=your-secret-access-key
     R2_BUCKET_NAME=your-bucket-name
     R2_PUBLIC_URL=your-public-url-or-cdn-url
     R2_ENDPOINT=your-r2-endpoint
     ```

5. **Set Up CORS (if needed)**
   - Configure CORS settings in R2 bucket settings
   - Allow your domain for direct browser uploads (optional)

## File Structure

- **Videos**: `movies/{movie-id}/video.mp4`
- **Thumbnails**: `movies/{movie-id}/thumbnail.jpg`
- **Subtitles**: `movies/{movie-id}/subtitles/{language}.vtt`

## Next Steps

1. Install required packages:
   ```bash
   npm install @supabase/supabase-js @aws-sdk/client-s3
   ```

2. Implement the client configurations in:
   - `lib/supabase/client.ts`
   - `lib/supabase/server.ts`
   - `lib/r2/client.ts`

3. Set up authentication middleware in `middleware.ts`
