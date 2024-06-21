# youtube-toolkit

download and fetch youtube videos .

[![NPM Version](https://img.shields.io/npm/v/youtube-toolkit.svg)](https://www.npmjs.com/package/youtube-toolkit)
![License](https://img.shields.io/github/license/Itzhep/youtube)
![NPM Downloads](https://img.shields.io/npm/dw/youtube-toolkit)
![stars](https://img.shields.io/github/stars/Itzhep/youtube)



## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install youtube-toolkit
```
## Usage
```javascript
const youtube = require("youtube-toolkit")

youtube.download("url") // download an video by link
const urls = [ // url list of videos 
    url = "",
    url2 = ""
]
youtube.batchDownload(urls , 2) // download multiple videos by link

youtube.downloadThumbnail("url") // download video tumbnail by link
youtube.fetch("url") // fetch details about video by link 

```
## Features
⭐ download video: download video from youtube from link.
<br>
⭐ download tumbnail: download video tumbnail by link.
<br>
⭐ download multiple videos : download multiple videos by links .
<br>
⭐ fetch : fetch details about video by link .

## Contributing
Contributions are welcome! Here's how you can contribute to this project:

Fork the repository.
Create a new branch (git checkout -b feature-branch).
Make your changes.
Commit your changes (git commit -am 'Add new feature').
Push to the branch (git push origin feature-branch).
Submit a pull request.
Please ensure your pull request adheres to the following guidelines:

Describe clearly what problem you're solving with this PR.
Keep the PR focused on a single feature or bug fix.

## license
This project is licensed under the ISC License - see the LICENSE file for details.
