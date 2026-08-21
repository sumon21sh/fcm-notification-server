# FCM Notification Server (Render.com এ deploy করার জন্য)

## ১. Firebase Service Account key নেওয়া
1. Firebase Console → Project Settings → **Service Accounts**
2. **Generate new private key** → একটা `.json` ফাইল ডাউনলোড হবে
3. এই ফাইলটা কোথাও commit করবেন না (GitHub-এ push করবেন না)

## ২. Render-এ deploy করা
1. এই ফোল্ডারটা একটা GitHub repo-তে push করুন (শুধু `server.js`, `package.json`, `README.md` — service account json বাদে)
2. Render.com → **New +** → **Web Service** → আপনার repo select করুন
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Environment** ট্যাবে দুটো env var যোগ করুন:
   - `FIREBASE_SERVICE_ACCOUNT` → পুরো service account JSON ফাইলের content এক লাইনে paste করুন (পুরো `{...}` অবজেক্ট)
   - `API_SECRET_KEY` → নিজের একটা random secret string (যেমন: `myApp_9x7Kq2sT`) — এটা দিয়ে আপনার admin app থেকে request authenticate হবে
5. Deploy করুন। কিছুক্ষণ পর একটা URL পাবেন, যেমন: `https://fcm-notification-server.onrender.com`

## ৩. Test করা (curl দিয়ে)
```bash
curl -X POST https://your-app.onrender.com/send-notification \
  -H "Content-Type: application/json" \
  -H "x-api-key: myApp_9x7Kq2sT" \
  -d '{
    "token": "USER_DEVICE_FCM_TOKEN",
    "title": "নতুন অর্ডার এসেছে",
    "body": "আপনার একটি নতুন অর্ডার আছে, চেক করুন।"
  }'
```

## ৪. Android Admin Panel অ্যাপ থেকে কল করা
Retrofit/OkHttp দিয়ে POST request পাঠাবেন:
- URL: `https://your-app.onrender.com/send-notification`
- Header: `x-api-key: myApp_9x7Kq2sT`
- Body (JSON): `{ "token": "...", "title": "...", "body": "..." }`

## ৫. এন্ডপয়েন্ট গুলো
- `POST /send-notification` — একটা নির্দিষ্ট device token-এ পাঠাতে
- `POST /send-notification-multicast` — একসাথে একাধিক token-এ পাঠাতে (`tokens: [...]`)
- `POST /send-notification-topic` — একটা topic subscribe করা সবাইকে পাঠাতে (`topic: "all_users"`)
- `GET /` — health check (Render sleep আটকাতে UptimeRobot দিয়ে এই URL ping করতে পারেন)

## গুরুত্বপূর্ণ নোট
- Render Free tier ১৫ মিনিট idle থাকলে sleep হয়ে যায় — প্রথম request-এ ৩০-৫০ সেকেন্ড দেরি হতে পারে
- `API_SECRET_KEY` কখনো client app-এর ভেতরে hardcode করে public repo-তে push করবেন না
- Android অ্যাপে FCM token পাওয়ার জন্য `FirebaseMessaging.getInstance().getToken()` ব্যবহার করে সেই token আপনার Firestore/database-এ user-এর সাথে সংরক্ষণ করতে হবে
