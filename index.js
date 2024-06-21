const axios = require('axios');
const cheerio = require('cheerio');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const readline = require('readline');

async function fetchVideoDetails(url, details = []) {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const videoDetails = {
            title: $('meta[name="title"]').attr('content'),
            description: $('meta[name="description"]').attr('content'),
            uploadDate: $('meta[itemprop="uploadDate"]').attr('content'),
            genre: $('meta[itemprop="genre"]').attr('content'),
            views: $('meta[itemprop="interactionCount"]').attr('content'),
        };

        if (details.length === 0) {
            details = Object.keys(videoDetails);
        }

        details.forEach(detail => {
            if (videoDetails[detail] !== undefined) {
                console.log(`${detail.charAt(0).toUpperCase() + detail.slice(1)}: ${videoDetails[detail]}`);
            } else {
                console.log(`Detail "${detail}" is not available.`);
            }
        });
    } catch (error) {
        console.error('Error fetching video details:', error);
    }
}

async function downloadVideo(url, quality = 'highest') {
    try {
        const userDir = process.cwd();
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
        const outputPath = path.resolve(userDir, `${title}.mp4`);
        const videoPath = path.resolve(userDir, `${title}_video.mp4`);
        const audioPath = path.resolve(userDir, `${title}_audio.mp3`);

        // Download video and audio separately
        const videoStream = ytdl(url, { quality: 'highestvideo' });
        const audioStream = ytdl(url, { quality: 'highestaudio' });

        // Write video and audio streams to separate files
        videoStream.pipe(fs.createWriteStream(videoPath));
        audioStream.pipe(fs.createWriteStream(audioPath));

        // When both streams finish downloading, merge them using FFmpeg
        videoStream.on('end', () => {
            audioStream.on('end', () => {
                ffmpeg()
                    .input(videoPath)
                    .input(audioPath)
                    .outputOptions('-c:v copy')
                    .outputOptions('-c:a aac')
                    .outputOptions('-strict experimental')
                    .save(outputPath)
                    .on('end', () => {
                        console.log(`Video downloaded and merged to ${outputPath}`);

                        // Clean up temporary files
                        fs.unlinkSync(videoPath);
                        fs.unlinkSync(audioPath);
                    })
                    .on('error', (err) => {
                        console.error('Error merging video and audio:', err);
                    });
            });
        });

        // Progress reporting
        let totalSize = 0;
        videoStream.on('progress', (chunkLength, downloaded, total) => {
            totalSize = total;
            const percent = downloaded / total * 100;
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Downloading video... ${percent.toFixed(2)}%`);
        });

        videoStream.on('end', () => {
            process.stdout.write('\n');
        });

    } catch (error) {
        console.error('Error downloading video:', error);
    }
}

async function downloadThumbnail(url) {
    try {
        const userDir = process.cwd();
        const info = await ytdl.getInfo(url);
        const thumbnailUrl = info.videoDetails.thumbnail.thumbnails[0].url;
        const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
        const thumbnailPath = path.resolve(userDir, `${title}_thumbnail.jpg`);

        const response = await axios.get(thumbnailUrl, { responseType: 'stream' });
        response.data.pipe(fs.createWriteStream(thumbnailPath));

        response.data.on('end', () => {
            console.log(`Thumbnail downloaded to ${thumbnailPath}`);
        });

    } catch (error) {
        console.error('Error downloading thumbnail:', error);
    }
}

async function batchDownload(urls, concurrency = 3) {
    try {
        
        const downloadQueue = urls.slice(); // Create a copy of the array

        const downloadNext = async () => {
            if (downloadQueue.length > 0) {
                const url = downloadQueue.shift();
                await downloadVideo(url);
                await downloadNext(); // Recursively call itself to continue downloading
            }
        };

        // Start initial downloads with limited concurrency
        const downloadPromises = [];
        for (let i = 0; i < concurrency; i++) {
            downloadPromises.push(downloadNext());
        }

        await Promise.all(downloadPromises);
        console.log('Batch download started ');

    } catch (error) {
        console.error('Error in batch download:', error);
    }
}

module.exports = {
    fetch: fetchVideoDetails,
    download: downloadVideo,
    downloadThumbnail: downloadThumbnail,
    batchDownload: batchDownload
};