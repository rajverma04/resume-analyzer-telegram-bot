const { GoogleGenAI, createUserContent, createPartFromUri } = require('@google/genai');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Sends a prompt and optional file to the Gemini AI and returns the generated response.
 * @param {string} prompt - The prompt to send to AI.
 * @param {object} options - Options containing resumeText or resumePath.
 * @returns {Promise<string>} - The AI generated analysis.
 */
async function analyzeWithGemini(resumeText, resumePath, jdText) {
    const promptText = `
You are an ATS system.

Analyze the resume against the job description.

Please structure your response into the following SECTIONS, each starting with the exact header specified below. 

IMPORTANT: For SECTION 4 and SECTION 5, do NOT use any Markdown formatting like bolding (**), italics, or code blocks (triple backticks). Use plain text with CAPITALIZED headers and clear spacing, making it look like a professional recruiter-friendly resume.

SECTION 1: Match Score
SECTION 2: Missing Skills
SECTION 3: Improvements
SECTION 4: ATS Optimized Resume
SECTION 5: Recruiter Friendly Resume

Resume:
${resumeText ? resumeText : "[See attached PDF]"}

Job Description:
${jdText}
`;

    try {
        let contents;
        const modelName = "gemini-2.5-flash"; // Available in this environment

        if (resumePath && resumePath.toLowerCase().endsWith('.pdf')) {
            // Upload PDF to Files API
            const myfile = await ai.files.upload({
                file: resumePath,
                config: {
                    mimeType: "application/pdf",
                    displayName: "User Resume"
                },
            });

            contents = [
                createUserContent([
                    createPartFromUri(myfile.uri, myfile.mimeType),
                    promptText,
                ])
            ];
        } else {
            // Text-based analysis for DOCX or if parsing fails
            contents = [
                {
                    parts: [{ text: promptText }]
                }
            ];
        }

        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents
        });

        if (response && response.text) {
            return response.text;
        } else {
            throw new Error('Failed to get a response from Gemini AI.');
        }
    } catch (error) {
        console.error('Gemini AI Error:', error.message);
        throw new Error('AI analysis failed. Please try again later.');
    }
}

module.exports = { analyzeWithGemini };
