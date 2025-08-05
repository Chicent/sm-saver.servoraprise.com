import express from 'express';
import fetch from 'node-fetch';
const app = express();

const API_TOKEN = process.env.APIFY_TOKEN;
const MAX_CALLS = 9000;
let callCount = 0;

app.get('/download', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('❌ URL required');
  if (callCount >= MAX_CALLS) return res.status(429).send('❌ API Limit reached');

  try {
    const run = await fetch(
      `https://api.apify.com/v2/acts/wilcode~all-social-media-video-downloader/run-sync-get-dataset-items?token=${API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }
    ).then(r => r.json());

    callCount++;
    const items = run.items || [];

    // ✅ Debug: print the response to console
    console.log("Apify items:", items);

    // ✅ Extract video URL safely (handles fallback cases)
    const videoUrl = items[0]?.videoUrl || items[0]?.video_urls?.[0]?.url || items[0]?.url;

    if (!videoUrl) {
      return res.send(`
        <h2>❌ No downloadable link found.</h2>
        <p>It might be a private or unsupported post.</p>
        <p>Try a different video or use one of our sibling savers.</p>
      `);
    }

    res.send(`
      <h2>✅ Download Ready</h2>
      <a href="${videoUrl}" download>Click to Download</a>
      <p>Calls left: ${MAX_CALLS - callCount}</p>
    `);
  } catch (e) {
    console.error("❌ API Error:", e);
    res.status(500).send('❌ Server error while fetching download link');
  }
});

// ✅ Fixes the "Cannot GET /" issue
app.get('/', (req, res) => {
  res.send('✅ SM Saver API is live and running!');
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server started on port 3000'));
