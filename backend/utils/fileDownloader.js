const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Downloads a file from a given URL and saves it to a temporary location.
 * @param {string} url - The URL of the file to download.
 * @param {string} fileName - The name to save the file as.
 * @returns {Promise<string>} - The absolute path of the downloaded file.
 */
async function downloadFile(url, fileName) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const filePath = path.join(tempDir, fileName);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
    });
}

module.exports = { downloadFile };
