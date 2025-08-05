import express from 'express';
import fetch from 'node-fetch';
const app = express();
const API_TOKEN = process.env.APIFY_TOKEN;
const MAX_CALLS = 9000;
let callCount = 0;

app.get('/download', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('URL required');
  if (callCount >= MAX_CALLS) return res.status(429).send('Limit reached');

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
    const videoUrl = items[0]?.videoUrl;

    if (!videoUrl) return res.send('<p>No downloadable link found.</p>');

    res.send(`
      <h2>Download Ready</h2>
      <a href="${videoUrl}" download>Click to Download</a>
      <p>Calls left: ${MAX_CALLS - callCount}</p>
    `);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error fetching download link');
  }
});

// ✅ Add this route to fix “Cannot GET /”
app.get('/', (req, res) => {
  res.send('✅ SM Saver API is live and running!');
});

app.listen(process.env.PORT || 3000, () => console.log('Server started'));
