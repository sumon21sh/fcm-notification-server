const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// প্রতিটা incoming request Render Logs-এ দেখানোর জন্য (ডিবাগ করতে সুবিধা হয়,
// এটা না থাকলে request পৌঁছালেও সফল হলে কোনো log দেখা যেত না)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path} — api-key present: ${!!req.header('x-api-key')}`);
  next();
});

// ---------- Firebase Admin Init ----------
// Render-এ Environment Variable হিসেবে পুরো JSON string রাখবেন (FIREBASE_SERVICE_ACCOUNT)
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  console.error('FIREBASE_SERVICE_ACCOUNT env var missing or invalid JSON:', err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ---------- Simple API key protection ----------
// Render env var: API_SECRET_KEY=your-own-random-secret
function checkApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== process.env.API_SECRET_KEY) {
    console.warn('[AUTH FAILED] provided key did not match API_SECRET_KEY');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// ---------- Health check (Render / UptimeRobot ping করার জন্য) ----------
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'FCM notification server is running' });
});

// ---------- Send to a single device token ----------
app.post('/send-notification', checkApiKey, async (req, res) => {
  const { token, title, body, data } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ success: false, error: 'token, title, body are required' });
  }

  try {
    const message = {
      token,
      notification: { title, body },
      data: data || {}, // optional custom key-value payload
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[SUCCESS] send-notification -> messageId: ${response}`);
    res.json({ success: true, messageId: response });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- Send to multiple device tokens at once ----------
app.post('/send-notification-multicast', checkApiKey, async (req, res) => {
  const { tokens, title, body, data } = req.body;

  if (!Array.isArray(tokens) || tokens.length === 0 || !title || !body) {
    return res.status(400).json({ success: false, error: 'tokens[], title, body are required' });
  }

  try {
    const message = {
      tokens,
      notification: { title, body },
      data: data || {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    });
  } catch (err) {
    console.error('Multicast send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- Send to a topic (e.g. "all_users") ----------
app.post('/send-notification-topic', checkApiKey, async (req, res) => {
  const { topic, title, body, data } = req.body;

  if (!topic || !title || !body) {
    return res.status(400).json({ success: false, error: 'topic, title, body are required' });
  }

  try {
    const message = {
      topic,
      notification: { title, body },
      data: data || {},
    };

    const response = await admin.messaging().send(message);
    console.log(`[SUCCESS] send-notification-topic -> topic: ${topic}, messageId: ${response}`);
    res.json({ success: true, messageId: response });
  } catch (err) {
    console.error('Topic send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FCM notification server running on port ${PORT}`);
});
