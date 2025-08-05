import express from 'express';
import fetch from 'node-fetch';
const app = express();

const API_TOKEN = process.env.APIFY_TOKEN;
const MAX_CALLS = 9000;
let callCount = 0;

app.get('/download', async (req, res) => {
  const url = req.query.url;
  console.log("Received URL:", url); // ✅ Log the incoming request

  if (!url) return res.status(400).send('❌ URL required');
  if (callCount >= MAX_CALLS) return res.status(429).send('❌ API Limit reached');

  // Detect platform
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isInstagram = url.includes('instagram.com');
  const isFacebook = url.includes('facebook.com');

  // Prepare request body
  const body = {
    url,
    proxySettings: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL'],
      apifyProxyCountry: 'US'
    }
  };

  // Merge AV if Facebook or Instagram
  if (isInstagram || isFacebook) {
    body.mergeAV = true;
  }

  // Merge AV for YouTube with quality
  if (isYouTube) {
    body.mergeYoutube = { quality: 720 };
  }

  try {
    const run = await fetch(
      `https://api.apify.com/v2/acts/wilcode~all-social-media-video-downloader/run-sync-get-dataset-items?token=${API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    ).then(r => r.json());

    callCount++;
    const items = run.items || [];
    console.log("Apify items:", items); // ✅ Log the response

    // ✅ Extract the most reliable download link
    const downloadUrl = items[0]?.download?.[0]?.url ||
                        items[0]?.formats?.[0]?.url ||
                        items[0]?.video_urls?.[0]?.url ||
                        items[0]?.videoUrl ||
                        items[0]?.url;

    if (!downloadUrl) {
      return res.send(`
        <h2>❌ No downloadable link found.</h2>
        <p>This may be due to privacy settings, unsupported post, or missing proxy/merge config.</p>
      `);
    }

    res.send(`
      <h2>✅ Download Ready</h2>
      <a href="${downloadUrl}" download>Click to Download</a>
      <p>Calls left: ${MAX_CALLS - callCount}</p>
    `);
  } catch (e) {
    console.error("❌ API Error:", e);
    res.status(500).send('❌ Server error while fetching download link');
  }
});

// ✅ Fixes "Cannot GET /" issue
app.get('/', (req, res) => {
  res.send('✅ SM Saver API is live and running!');
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server started on port 3000'));
