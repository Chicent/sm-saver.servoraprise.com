import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const API_TOKEN = process.env.APIFY_TOKEN;
const MAX_CALLS = 9000;
let callCount = 0;

app.use(express.json());

app.get('/download', async (req, res) => {
  const url = req.query.url;
  console.log("///////////////////////////////////////////////////////////");
  console.log("Received URL:", url);

  if (!url) return res.status(400).send('❌ URL required');
  if (callCount >= MAX_CALLS) return res.status(429).send('❌ API Limit reached');

  // Detect platform
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isInstagram = url.includes('instagram.com');
  const isFacebook = url.includes('facebook.com');

  // Prepare Apify input
  const input = {
    videoUrl: url,
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL'],
      apifyProxyCountry: 'US'
    }
  };

  if (isFacebook || isInstagram) {
    input.mergeAV = true;
  }

  if (isYouTube) {
    input.mergeYoutube = { quality: 720 };
  }

  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~social-media-downloader/run-sync-get-dataset-items?token=${API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runInput: input }),
      }
    );

    const items = await response.json();
    callCount++;

    console.log("Apify items:", items);

    if (!Array.isArray(items) || items.length === 0) {
      return res.send(`
        <h2>❌ No downloadable link found.</h2>
        <p>This may be due to privacy settings, unsupported post, or actor failure.</p>
      `);
    }

    const downloadUrl = items[0]?.download?.[0]?.url ||
                        items[0]?.formats?.[0]?.url ||
                        items[0]?.video_urls?.[0]?.url ||
                        items[0]?.videoUrl ||
                        items[0]?.url;

    if (!downloadUrl) {
      return res.send(`
        <h2>❌ No downloadable link found.</h2>
        <p>This may be due to privacy settings, unsupported post, or missing link.</p>
      `);
    }

    res.send(`
      <h2>✅ Download Ready</h2>
      <a href="${downloadUrl}" download>Click to Download</a>
      <p>Calls left: ${MAX_CALLS - callCount}</p>
    `);
  } catch (e) {
    console.error("❌ API Error:", e.message);
    res.status(500).send('❌ Server error while fetching download link');
  }
});

app.get('/', (req, res) => {
  res.send('✅ SM Saver API is live and running!');
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server started on port 3000'));
