const TelegramBot = require('node-telegram-bot-api');
const { parseResume } = require('../services/parserService');
const analysisService = require('../services/analysisService');
const { downloadFile } = require('../utils/fileDownloader');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Command: /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    analysisService.clearState(chatId);
    bot.sendMessage(chatId, "Welcome to the Resume Analyzer Bot! 🤖\n\n1️⃣ Send your resume as a PDF or DOCX file.\n2️⃣ Then send the job description as text.\n\nI'll analyze them and give you feedback! 🚀");
});

// Command: /analyze (manual trigger)
bot.onText(/\/analyze/, async (msg) => {
    const chatId = msg.chat.id;
    const state = analysisService.getState(chatId);
    
    if (!state.resumeText && !state.resumePath) {
        return bot.sendMessage(chatId, "❌ Please upload your resume first (PDF/DOCX).");
    }
    
    bot.sendMessage(chatId, "📝 Please send the job description text now.");
});

// Handle Documents (Resumes)
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name;
    const extension = fileName.split('.').pop().toLowerCase();

    if (extension !== 'pdf' && extension !== 'docx') {
        return bot.sendMessage(chatId, "❌ Invalid file format. Please send a PDF or DOCX file.");
    }

    try {
        bot.sendMessage(chatId, "📥 Downloading and processing your resume...");
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
        
        const filePath = await downloadFile(fileUrl, fileName);
        
        if (extension === 'pdf') {
            await analysisService.setState(chatId, { resumePath: filePath, resumeText: '' });
        } else {
            // For DOCX, extract text as before
            const resumeText = await parseResume(filePath);
            await analysisService.setState(chatId, { resumeText, resumePath: '' });
        }
        
        bot.sendMessage(chatId, "✅ Resume received! Now send the job description as text to start analysis.");
    } catch (error) {
        console.error('File Processing Error:', error);
        bot.sendMessage(chatId, "❌ Failed to process resume. Please try again.");
    }
});

// Helper to send long messages by sections
async function sendLongMessage(chatId, text) {
    // Split by SECTION headers
    const sections = text.split(/(?=SECTION \d+:)/);
    
    for (const section of sections) {
        if (section.trim()) {
            // Further split if an individual section is still too long (rare)
            const maxLength = 4000;
            for (let i = 0; i < section.length; i += maxLength) {
                const chunk = section.substring(i, i + maxLength);
                try {
                    // Try to send with Markdown
                    await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
                } catch (error) {
                    // Fallback to plain text if Markdown parsing fails
                    console.warn('Markdown parsing failed, sending plain text instead.');
                    await bot.sendMessage(chatId, chunk);
                }
            }
        }
    }
}

// Handle Text Messages (Job Description)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignore commands
    if (text && text.startsWith('/')) return;

    // Ignore messages starting with '📥', '✅', '❌' (bot responses)
    if (text && (text.startsWith('📥') || text.startsWith('✅') || text.startsWith('❌'))) return;

    const state = analysisService.getState(chatId);

    if ((state.resumeText || state.resumePath) && text) {
        try {
            bot.sendMessage(chatId, "🧠 Analyzing your resume against the JD... Please wait. ⏳");
            const result = await analysisService.analyze(chatId, text);
            
            // Send the analysis text (split by sections)
            const cleanedText = result.text.replace(/```/g, '');
            await sendLongMessage(chatId, cleanedText);
            
            // Send the generated PDFs
            if (result.pdfs && result.pdfs.length > 0) {
                bot.sendMessage(chatId, "📄 Here are your improved resume versions:");
                for (const pdf of result.pdfs) {
                    await bot.sendDocument(chatId, pdf.path, { 
                        caption: pdf.name,
                        contentType: 'application/pdf' // Fix deprecation warning
                    });
                }
            }
        } catch (error) {
            console.error('Analysis Error:', error);
            bot.sendMessage(chatId, `❌ ${error.message || 'Analysis failed. Please try again.'}`);
        }
    } else if (!state.resumeText && !state.resumePath && text) {
        bot.sendMessage(chatId, "💡 Please upload your resume (PDF/DOCX) first before sending the job description.");
    }
});

console.log('Bot is running...');

module.exports = bot;
