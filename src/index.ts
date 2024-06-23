import axios from 'axios';
import cheerio from 'cheerio';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import readline from 'readline';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);

interface VideoDetails {
    title: string;
    description: string;
    uploadDate: string;
    genre: string;
    views: string;
}

interface ChannelInfo {
    channelName: string;
    description: string;
}

interface VideoMetadata {
    title: string;
    duration: string;
    format: string;
    resolution: string;
}

export async function fetchVideoDetails(url: string, details: string[] = []): Promise<Record<string, string>> {
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const videoDetails: VideoDetails = {
            title: $('meta[name="title"]').attr('content') || '',
            description: $('meta[name="description"]').attr('content') || '',
            uploadDate: $('meta[itemprop="uploadDate"]').attr('content') || '',
            genre: $('meta[itemprop="genre"]').attr('content') || '',
            views: $('meta[itemprop="interactionCount"]').attr('content') || '',
        };

        if (details.length === 0) {
            details = Object.keys(videoDetails);
        }

        const result: Record<string, string> = {};
        details.forEach(detail => {
            if (videoDetails[detail as keyof VideoDetails] !== undefined) {
                result[detail] = videoDetails[detail as keyof VideoDetails];
            } else {
                result[detail] = `Detail "${detail}" is not available.`;
            }
        });
        console.log(result);
        return result;
    } catch (error) {
        console.error('Error fetching video details:', error);
        throw error;
    }
}

export async function getChannelInfo(channelId: string): Promise<ChannelInfo> {
    try {
        const channelUrl = `https://www.youtube.com/${channelId}`;
        const response = await axios.get(channelUrl);
        const html = response.data;
        const $ = cheerio.load(html);

        const channelName = $('meta[property="og:title"]').attr('content') || '';
        const description = $('meta[property="og:description"]').attr('content') || '';
        console.log({ channelName, description });
        return { channelName, description };
    } catch (error) {
        console.error('Error fetching channel information:', error);
        throw error;
    }
}

export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
    try {
        const info = await ytdl.getInfo(url);
        const metadata: VideoMetadata = {
            title: info.videoDetails.title,
            duration: info.videoDetails.lengthSeconds + ' seconds',
            format: info.formats[0].container,
            resolution: info.formats[0].qualityLabel,
        };
        console.log(metadata);
        return metadata;
    } catch (error) {
        console.error('Error fetching video metadata:', error);
        throw error;
    }
}

export async function downloadVideo(url: string, quality: string = 'highest'): Promise<void> {
    try {
        const userDir = process.cwd();
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
        const outputPath = path.resolve(userDir, `${title}.mp4`);
        const videoPath = path.resolve(userDir, `${title}_video.mp4`);
        const audioPath = path.resolve(userDir, `${title}_audio.mp3`);

        const videoStream = ytdl(url, { quality: 'highestvideo' });
        const audioStream = ytdl(url, { quality: 'highestaudio' });

        videoStream.pipe(fs.createWriteStream(videoPath));
        audioStream.pipe(fs.createWriteStream(audioPath));

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
                        fs.unlinkSync(videoPath);
                        fs.unlinkSync(audioPath);
                    })
                    .on('error', (err) => {
                        console.error('Error merging video and audio:', err);
                    });
            });
        });

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
        throw error;
    }
}

export async function downloadSubtitles(url: string, language: string = 'en'): Promise<void> {
    try {
        const userDir = process.cwd();
        const info = await ytdl.getInfo(url);

        const subtitles = info.player_response.captions
            ? info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks
            : [];

        let subtitle = subtitles.find(sub => sub.languageCode === language);
        if (!subtitle && subtitles.length > 0) {
            subtitle = subtitles[0];
            console.log(`Subtitles in ${language} not available. Downloading in ${subtitle.languageCode} instead.`);
        }

        if (subtitle) {
            const subtitleUrl = subtitle.baseUrl;
            const subtitlePath = path.resolve(userDir, `${info.videoDetails.title}_${subtitle.languageCode}.vtt`);

            const response = await axios.get(subtitleUrl, { responseType: 'stream' });
            response.data.pipe(fs.createWriteStream(subtitlePath));

            response.data.on('end', () => {
                console.log(`Subtitles downloaded to ${subtitlePath}`);
            });
        } else {
            console.log(`No subtitles available for this video.`);
        }
    } catch (error) {
        console.error('Error downloading subtitles:', error);
        throw error;
    }
}

export async function downloadThumbnail(url: string): Promise<void> {
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
        throw error;
    }
}

export async function batchDownload(urls: string[], concurrency: number = 3): Promise<void> {
    try {
        const downloadQueue = urls.slice();

        const downloadNext = async (): Promise<void> => {
            if (downloadQueue.length > 0) {
                const url = downloadQueue.shift();
                if (url) {
                    await downloadVideo(url);
                    await downloadNext();
                }
            }
        };

        const downloadPromises: Promise<void>[] = [];
        for (let i = 0; i < concurrency; i++) {
            downloadPromises.push(downloadNext());
        }

        await Promise.all(downloadPromises);
        console.log('Batch download started');
    } catch (error) {
        console.error('Error in batch download:', error);
        throw error;
    }
}
