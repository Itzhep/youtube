"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchDownload = exports.downloadThumbnail = exports.downloadSubtitles = exports.downloadVideo = exports.getVideoMetadata = exports.getChannelInfo = exports.fetchVideoDetails = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const readline_1 = __importDefault(require("readline"));
const util_1 = require("util");
const writeFileAsync = (0, util_1.promisify)(fs_1.default.writeFile);
function fetchVideoDetails(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, details = []) {
        try {
            const response = yield axios_1.default.get(url);
            const html = response.data;
            const $ = cheerio_1.default.load(html);
            const videoDetails = {
                title: $('meta[name="title"]').attr('content') || '',
                description: $('meta[name="description"]').attr('content') || '',
                uploadDate: $('meta[itemprop="uploadDate"]').attr('content') || '',
                genre: $('meta[itemprop="genre"]').attr('content') || '',
                views: $('meta[itemprop="interactionCount"]').attr('content') || '',
            };
            if (details.length === 0) {
                details = Object.keys(videoDetails);
            }
            const result = {};
            details.forEach(detail => {
                if (videoDetails[detail] !== undefined) {
                    result[detail] = videoDetails[detail];
                }
                else {
                    result[detail] = `Detail "${detail}" is not available.`;
                }
            });
            console.log(result);
            return result;
        }
        catch (error) {
            console.error('Error fetching video details:', error);
            throw error;
        }
    });
}
exports.fetch = fetchVideoDetails;
function getChannelInfo(channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channelUrl = `https://www.youtube.com/${channelId}`;
            const response = yield axios_1.default.get(channelUrl);
            const html = response.data;
            const $ = cheerio_1.default.load(html);
            const channelName = $('meta[property="og:title"]').attr('content') || '';
            const description = $('meta[property="og:description"]').attr('content') || '';
            console.log({ channelName, description });
            return { channelName, description };
        }
        catch (error) {
            console.error('Error fetching channel information:', error);
            throw error;
        }
    });
}
exports.getChannelInfo = getChannelInfo;
function getVideoMetadata(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const info = yield ytdl_core_1.default.getInfo(url);
            const metadata = {
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds + ' seconds',
                format: info.formats[0].container,
                resolution: info.formats[0].qualityLabel,
            };
            console.log(metadata);
            return metadata;
        }
        catch (error) {
            console.error('Error fetching video metadata:', error);
            throw error;
        }
    });
}
exports.getVideoMetadata = getVideoMetadata;
function downloadVideo(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, quality = 'highest') {
        try {
            const userDir = process.cwd();
            const info = yield ytdl_core_1.default.getInfo(url);
            const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
            const outputPath = path_1.default.resolve(userDir, `${title}.mp4`);
            const videoPath = path_1.default.resolve(userDir, `${title}_video.mp4`);
            const audioPath = path_1.default.resolve(userDir, `${title}_audio.mp3`);
            const videoStream = (0, ytdl_core_1.default)(url, { quality: 'highestvideo' });
            const audioStream = (0, ytdl_core_1.default)(url, { quality: 'highestaudio' });
            videoStream.pipe(fs_1.default.createWriteStream(videoPath));
            audioStream.pipe(fs_1.default.createWriteStream(audioPath));
            videoStream.on('end', () => {
                audioStream.on('end', () => {
                    (0, fluent_ffmpeg_1.default)()
                        .input(videoPath)
                        .input(audioPath)
                        .outputOptions('-c:v copy')
                        .outputOptions('-c:a aac')
                        .outputOptions('-strict experimental')
                        .save(outputPath)
                        .on('end', () => {
                        console.log(`Video downloaded and merged to ${outputPath}`);
                        fs_1.default.unlinkSync(videoPath);
                        fs_1.default.unlinkSync(audioPath);
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
                readline_1.default.cursorTo(process.stdout, 0);
                process.stdout.write(`Downloading video... ${percent.toFixed(2)}%`);
            });
            videoStream.on('end', () => {
                process.stdout.write('\n');
            });
        }
        catch (error) {
            console.error('Error downloading video:', error);
            throw error;
        }
    });
}
exports.downloadVideo = downloadVideo;
function downloadSubtitles(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, language = 'en') {
        try {
            const userDir = process.cwd();
            const info = yield ytdl_core_1.default.getInfo(url);
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
                const subtitlePath = path_1.default.resolve(userDir, `${info.videoDetails.title}_${subtitle.languageCode}.vtt`);
                const response = yield axios_1.default.get(subtitleUrl, { responseType: 'stream' });
                response.data.pipe(fs_1.default.createWriteStream(subtitlePath));
                response.data.on('end', () => {
                    console.log(`Subtitles downloaded to ${subtitlePath}`);
                });
            }
            else {
                console.log(`No subtitles available for this video.`);
            }
        }
        catch (error) {
            console.error('Error downloading subtitles:', error);
            throw error;
        }
    });
}
exports.downloadSubtitles = downloadSubtitles;
function downloadThumbnail(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userDir = process.cwd();
            const info = yield ytdl_core_1.default.getInfo(url);
            const thumbnailUrl = info.videoDetails.thumbnail.thumbnails[0].url;
            const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
            const thumbnailPath = path_1.default.resolve(userDir, `${title}_thumbnail.jpg`);
            const response = yield axios_1.default.get(thumbnailUrl, { responseType: 'stream' });
            response.data.pipe(fs_1.default.createWriteStream(thumbnailPath));
            response.data.on('end', () => {
                console.log(`Thumbnail downloaded to ${thumbnailPath}`);
            });
        }
        catch (error) {
            console.error('Error downloading thumbnail:', error);
            throw error;
        }
    });
}
exports.downloadThumbnail = downloadThumbnail;
function batchDownload(urls_1) {
    return __awaiter(this, arguments, void 0, function* (urls, concurrency = 3) {
        try {
            const downloadQueue = urls.slice();
            const downloadNext = () => __awaiter(this, void 0, void 0, function* () {
                if (downloadQueue.length > 0) {
                    const url = downloadQueue.shift();
                    if (url) {
                        yield downloadVideo(url);
                        yield downloadNext();
                    }
                }
            });
            const downloadPromises = [];
            for (let i = 0; i < concurrency; i++) {
                downloadPromises.push(downloadNext());
            }
            yield Promise.all(downloadPromises);
            console.log('Batch download started');
        }
        catch (error) {
            console.error('Error in batch download:', error);
            throw error;
        }
    });
}
exports.batchDownload = batchDownload;
