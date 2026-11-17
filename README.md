# Paint & Sip ticket site (bank transfer + WhatsApp receipt)

Flow: guest registers on the page -> sees bank details + reference -> sends receipt on WhatsApp -> client sets Status to "Paid" in the Google Sheet -> guest is emailed the ticket with QR code.

## 1. Google Sheet + Apps Script
1. Create a Google Sheet. Extensions > Apps Script. Paste apps-script/Code.gs.
2. Select the `setup` function and click Run. Allow the permissions (Sheets, Gmail send, external requests). This adds headers, the Pending/Paid dropdown and the email trigger.
3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the Web app URL.
4. Paste it into `CONFIG.SCRIPT_URL` in index.html.
5. After any later code change: Deploy > Manage deployments > edit > New version.
Emails send from the Google account that owns the script (about 100/day on a free account).

## 2. Run locally
VS Code Live Server on index.html, or `python -m http.server 8000`.

## 3. GitHub + Render (free)
Push to GitHub. Render > New > Static Site > pick the repo. Build command empty, publish directory `.`

## Event-day routine
- Client: after seeing the money in her bank, open the Sheet (phone works) and set the guest's Status to Paid. The ticket email goes out within seconds, and "Ticket sent" fills in.
- Door: scan the QR with any scanner app (it shows the ticket code), search it in the Sheet (Ctrl+F), check it is Paid, and mark "Checked in" Yes.

## Check-in page (checkin.html)
1. Apps Script > Project Settings > Script properties > add `CHECKIN_PIN` = a PIN you choose (share only with door staff).
2. Deploy > Manage deployments > edit > New version (the URL stays the same).
3. Paste the same Web app URL into `SCRIPT_URL` in checkin.html.
4. Open `yoursite.onrender.com/checkin.html` on a phone (HTTPS is needed for the camera). Enter the PIN, scan: green VALID shows the ticket code and name and marks them Checked in. A second scan shows ALREADY USED.
