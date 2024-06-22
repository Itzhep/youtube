const express = require('express');
const youtube = require('youtube-toolkit');

const app = express();
const port = 3000;

app.use(express.json());

app.get('/api/fetch', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const videoDetails = await youtube.fetch(url);
        res.status(200).json(videoDetails);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching video details', details: error.message });
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});