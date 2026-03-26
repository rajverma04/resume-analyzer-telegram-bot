const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Parses a PDF file and extracts its text content.
 * @param {string} filePath - Absolute path to the PDF file.
 * @returns {Promise<string>} - The extracted text.
 */
async function parsePDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    let data;
    try {
        data = await pdf.PDFParse(dataBuffer);
    } catch (e) {
        if (e.message.includes("Class constructors cannot be invoked without 'new'")) {
            data = await new pdf.PDFParse(dataBuffer);
        } else {
            throw e;
        }
    }
    return data.text;
}

/**
 * Parses a DOCX file and extracts its text content.
 * @param {string} filePath - Absolute path to the DOCX file.
 * @returns {Promise<string>} - The extracted text.
 */
async function parseDOCX(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}

/**
 * Parses a file (PDF or DOCX) based on its extension.
 * @param {string} filePath - Absolute path to the file.
 * @returns {Promise<string>} - The extracted text.
 */
async function parseResume(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    if (extension === 'pdf') {
        return await parsePDF(filePath);
    } else if (extension === 'docx') {
        return await parseDOCX(filePath);
    } else {
        throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
    }
}

module.exports = { parseResume };
