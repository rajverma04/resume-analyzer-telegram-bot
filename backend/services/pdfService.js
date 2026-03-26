const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a professionally formatted PDF from resume text.
 * @param {string} text - The resume content (Markdown-like).
 * @param {string} fileName - The name of the file to save.
 * @returns {Promise<string>} - Absolute path to the generated PDF.
 */
async function generateResumePDF(text, fileName) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const filePath = path.join(tempDir, fileName);
    const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
            Title: fileName.replace('.pdf', ''),
            Author: 'Resume Analyzer Bot'
        }
    });
    
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Split text into lines for processing
    const lines = text.split('\n');
    let isFirstLine = true;

    for (let line of lines) {
        line = line.trim().replace(/```/g, '').replace(/`/g, '');
        if (!line) {
            doc.moveDown(0.5);
            continue;
        }

        // Remove horizontal rules
        if (line === '---' || line === '***') {
            doc.moveDown(0.5);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
            doc.moveDown(0.5);
            continue;
        }

        // Header Formatting (e.g., Name or Section Titles)
        if (isFirstLine) {
            // Assume first line is the name
            const name = line.replace(/^\*\*|\*\*$/g, '').trim();
            if (!name) continue; // Skip if line was just backticks
            doc.fontSize(20).font('Helvetica-Bold').fillColor('#333333').text(name, { align: 'center' });
            doc.moveDown(0.5);
            isFirstLine = false;
            continue;
        }

        // Section Headers (e.g., **SKILLS**, **PROJECTS**)
        if (/^(\*\*|```).*(\*\*|```)$/.test(line)) {
            const header = line.replace(/^\*\*|```|\*\*|```$/g, '');
            if (!header.trim()) continue;
            doc.moveDown(1);
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0044cc').text(header.toUpperCase(), { underline: true });
            doc.moveDown(0.5);
            continue;
        }

        // Bullet Points
        if (line.startsWith('* ') || line.startsWith('- ')) {
            let content = line.substring(2);
            // Handle bold/code within bullets
            content = content.replace(/```/g, '').replace(/`/g, '').replace(/\*\*(.*?)\*\*/g, '$1');
            
            doc.fontSize(11).font('Helvetica').fillColor('#000000');
            doc.text('• ' + content, {
                indent: 10,
                align: 'left',
                lineGap: 2
            });
            continue;
        }

        // Subheaders or project names within sections
        if (line.startsWith('### ')) {
            const subheader = line.replace('### ', '');
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text(subheader);
            continue;
        }

        // Normal Text
        let cleanLine = line.replace(/```/g, '').replace(/`/g, '').replace(/\*\*(.*?)\*\*/g, '$1');
        if (!cleanLine.trim()) continue; // Skip lines that become empty after stripping
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(cleanLine, {
            lineGap: 2,
            align: 'justify'
        });
    }

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    });
}

module.exports = { generateResumePDF };
