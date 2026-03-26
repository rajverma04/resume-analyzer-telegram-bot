const { analyzeWithGemini } = require('./aiService');

/**
 * Analysis service to maintain user state and coordinate parsing and analysis.
 */
class AnalysisService {
    constructor() {
        this.userState = new Map();
    }

    /**
     * Store the extracted resume text or path for a user.
     * @param {number} chatId - Telegram chat ID.
     * @param {object} data - Data containing resumeText and/or resumePath.
     */
    async setState(chatId, data) {
        if (!this.userState.has(chatId)) {
            this.userState.set(chatId, { resumeText: '', resumePath: '', jd: '' });
        }
        const state = this.userState.get(chatId);
        Object.assign(state, data);
    }

    /**
     * Get the current state for a user.
     * @param {number} chatId - Telegram chat ID.
     * @returns {object} - User state object.
     */
    getState(chatId) {
        return this.userState.get(chatId) || { resumeText: '', resumePath: '', jd: '' };
    }

    /**
     * Clear the state for a user.
     * @param {number} chatId - Telegram chat ID.
     */
    clearState(chatId) {
        this.userState.delete(chatId);
    }

    /**
     * Run the analysis based on JD and stored resume.
     * @param {number} chatId - Telegram chat ID.
     * @param {string} jdText - Job description text.
     * @returns {Promise<object>} - Analysis results with text and PDF paths.
     */
    async analyze(chatId, jdText) {
        const state = this.getState(chatId);
        if (!state.resumeText && !state.resumePath) {
            throw new Error('Please upload your resume first.');
        }

        const rawAnalysis = await analyzeWithGemini(state.resumeText, state.resumePath, jdText);
        
        // Parse sections for PDF generation
        const sections = rawAnalysis.split(/(?=SECTION \d+:)/);
        let atsResume = "";
        let recruiterResume = "";

        sections.forEach(s => {
            if (s.includes("SECTION 4:")) atsResume = s.replace(/SECTION 4: ATS Optimized Resume/, "").trim();
            if (s.includes("SECTION 5:")) recruiterResume = s.replace(/SECTION 5: Recruiter Friendly Resume/, "").trim();
        });

        const results = {
            text: rawAnalysis,
            pdfs: []
        };

        const { generateResumePDF } = require('./pdfService');

        if (atsResume) {
            const path = await generateResumePDF(atsResume, `ATS_Optimized_Resume_${chatId}.pdf`);
            results.pdfs.push({ path, name: 'ATS_Optimized_Resume.pdf' });
        }
        if (recruiterResume) {
            const path = await generateResumePDF(recruiterResume, `Recruiter_Friendly_Resume_${chatId}.pdf`);
            results.pdfs.push({ path, name: 'Recruiter_Friendly_Resume.pdf' });
        }

        return results;
    }
}

module.exports = new AnalysisService();
