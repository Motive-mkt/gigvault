# GigVault

A gig-worker budget tracker. Site (landing page) lives at the root; the installable app lives in /app.

## Structure
- `/index.html` — marketing/landing page
- `/app/` — the GigVault PWA (installable on iPhone & Android via "Add to Home Screen")
- `/app/js/app.js` — app logic, currently uses localStorage; replace `verifyLicenseRemote()` with a real fetch to your Firebase function once that's set up
- `/icons/` — brand assets

## Deploy
This is a static site — deploy directly to Vercel with no build step (Framework Preset: "Other").

## Next steps to finish wiring
1. Create a Firebase project, enable Firestore
2. Write a Cloud Function `verifyLicense(code)` that checks Firestore for a valid 5-digit code
3. Set up a Whop webhook on purchase that calls a Cloud Function to generate the code, store it in Firestore, and email/text it to the buyer
4. Replace the placeholder in `app/js/app.js` -> `verifyLicenseRemote()` with a fetch call to that Cloud Function URL
