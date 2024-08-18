const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const client = new OpenAI({
     apiKey: ''
});

// Function to perform OpenAI API request
async function OpenAIChatCompletion(prompt) {
    try {
        const response = await client.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-3.5-turbo', // or use 'gpt-4' if available
            max_tokens: 100,
            temperature: 0.0,
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API request error:', error);
        throw error;
    }
}

// Function to categorize data
async function isItAComplaint(data) {
    console.log(`Id: ${data['_id']}`);
    if (data && data._source) {
        const complaintText = data._source.complaint_what_happened || 'Unidentifiable';
        const prompt = `Is the following text a complaint? Answer in 'Yes' or 'No'\n\n${complaintText}`;
        return await OpenAIChatCompletion(prompt);
    }
}

async function categorizeData(data) {
     if (data && data._source) {
         const complaintText = data._source.issue || 'No complaint text available';
         const prompt = `Create a category based on the issue, but if possible and applicable, use the categories already created. It should be less than 5 words'\n\n${complaintText}`;
         return await OpenAIChatCompletion(prompt);
     }
 }

// Function to summarize data
async function summarizeData(data) {
    if (data && data._source) {
        const complaintText = data._source.complaint_what_happened || 'No summary';
        const prompt = `Summarize this complaint in detail and be very specific, complete all sentences, and the answer must be anywhere between 1 to 3 sentences.\n\n${complaintText}`;
        return await OpenAIChatCompletion(prompt);
    }
}

// Read JSON file and process data
async function processJsonFile() {
    const filePath = path.resolve(__dirname, 'ruby_hackathon.json');
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const item of data) {
               console.log(await isItAComplaint(item));
               console.log(await categorizeData(item));
               console.log(await summarizeData(item));
        }
    } catch (error) {
        console.error('Error reading or processing JSON file:', error);
    }
}

// Run the function
processJsonFile();