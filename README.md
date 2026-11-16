# Paint & Sip ticket site

Static page (index.html) + Google Apps Script (apps-script/Code.gs). Payments: Paystack (NGN 16,000).

## 1. Paystack
- Dashboard > Settings > Preferences / Business: add the settlement account (GTBank, name must match your Paystack KYC name).
- Settings > API Keys: copy the Public key into `CONFIG.PAYSTACK_PUBLIC_KEY` in index.html. Start with the test key, switch to live after testing.
- The secret key goes ONLY into Apps Script properties (step 2). Never commit it.

## 2. Google Sheet + Apps Script
1. New Google Sheet > Extensions > Apps Script. Paste apps-script/Code.gs.
2. Project Settings > Script properties > add `PAYSTACK_SECRET` = your Paystack secret key.
3. Run `doPost` once (or any function) to grant permissions (Sheets, Gmail send, external requests).
4. Deploy > New deployment > Web app: Execute as **Me**, Who has access **Anyone**. Copy the Web app URL into `CONFIG.SCRIPT_URL` in index.html.
5. After any code change: Deploy > Manage deployments > edit > New version.

## 3. GitHub + VS Code
```
cd paint-and-sip
git init && git add . && git commit -m "Paint & Sip site"
git branch -M main
git remote add origin https://github.com/YOUR_USER/paint-and-sip.git
git push -u origin main
```
Then in VS Code: clone the repo.

## 4. Render (free)
New > Static Site > connect the repo. Build command: leave empty. Publish directory: `.`  You get a free yourname.onrender.com link.

## Check-in
Scan the QR with any scanner app (it reads the ticket code), search the code in the Sheet, and change "Checked in" to Yes.
Test with Paystack test cards before going live. International cards must be enabled on your Paystack account for guests paying from Cyprus.
