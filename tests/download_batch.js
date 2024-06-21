const youtube = require('youtube-toolkit');
const videoUrls = [
    'https://www.youtube.com/watch?v=XmBoifqLaWQ&list=PLdcabfrF6Hch6qyJoN8ISDTyH7WUTBaiM&index=1&pp=gAQBiAQB8AUB',
    'https://www.youtube.com/watch?v=yJnEHvDCvYo&list=PLdcabfrF6Hch6qyJoN8ISDTyH7WUTBaiM&index=2&pp=gAQBiAQB8AUB',
];


youtube.batchDownload(videoUrls, 2)
