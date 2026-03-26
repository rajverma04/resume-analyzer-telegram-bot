const express = require('express');
const bot = require('./bot/telegram');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Resume Analyzer Bot is running! 🤖');
});

// Start Express server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
