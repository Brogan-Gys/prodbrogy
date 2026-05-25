# Sanity Setup

1. Create a Sanity project at https://www.sanity.io/manage.
2. Copy `.env.local.example` to `.env.local`.
3. Add your project values:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_ASSET_BASE_URL=https://pub-471cfb80efa24404bc77c5c9793f45c7.r2.dev

R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
SANITY_API_WRITE_TOKEN=your_sanity_write_token
ADMIN_UPLOAD_PASSWORD=choose_a_private_password
```

4. Run the app:

```bash
npm.cmd run dev
```

5. Open the Studio at:

```bash
http://localhost:3000/studio
```

The frontend reads `soundAsset` documents from Sanity. Add a title, category, preview URL or R2 path, download URL or R2 path, credits, BPM, key, mood, waveform values, tags, and accent color.

Store audio and ZIP files in Cloudflare R2, then put paths like `previews/kit-preview.mp3` and `downloads/kit.zip` in Sanity. The app turns those paths into public URLs using `NEXT_PUBLIC_ASSET_BASE_URL`. Full external URLs still work as fallbacks; Mega links will continue to open Mega's download page.

For faster publishing, open the private admin at:

```bash
http://localhost:3000/admin/upload
```

The uploader asks for `ADMIN_UPLOAD_PASSWORD`, uploads the selected preview/download files to R2, and creates the matching `soundAsset` document in Sanity. Preview audio uploads are automatically converted into 20-second MP3 previews with a short fade-out before they are saved to R2. Create `SANITY_API_WRITE_TOKEN` from Sanity Manage with write access to the dataset. Create the R2 access key in Cloudflare with permission to write to the bucket.

The same admin page can also load the current Sanity sound list, edit metadata and paths, and delete sounds. Delete removes the Sanity document and also removes linked R2 files when `previewUrl` or `downloadUrl` is an R2 path like `previews/name.mp3` or `downloads/name.zip`. Full external URLs are left alone.

If Sanity is not configured yet, or if there are no `soundAsset` documents, the site shows an empty library.
