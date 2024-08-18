require('dotenv').config();

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const client = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
});

// Function to perform OpenAI API request
async function OpenAIChatCompletion(prompt) {
    try {
        const response = await client.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-3.5-turbo', // using the GPT-3.5-turbo model to maximize token usage for large JSON file
            max_tokens: 115, //limits token usage to 115 per API call to prevent overuse, but enough to generate good responses
            temperature: 0.0,// low temp variability to minimize varietal results, especially for sub-categorization (so more of them are categorized as similarly as possible)
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API request error:', error);
        throw error;
    }
}

// Function to categorize whether it is complaint or not using OpenAI API
async function isItAComplaint(data) {
    console.log(`ID: ${data['_id']}`);
    if (data && data._source) {
        const complaintText = data._source.complaint_what_happened || 'Unidentifiable';
        const prompt = `Does the following text qualify as a complaint? Provide a 'Yes' or 'No' answer:\n\n${complaintText}`;
        return await OpenAIChatCompletion(prompt);
    }
}

// Function to categorize data based on issue using OpenAI API
async function categorizeData(data) {
     if (data && data._source) {
         const complaintText = data._source.issue || 'No complaint text available';
         const prompt = `Create a category based on the issue, but if possible and applicable, use the categories already created. It should be less than 5 words'\n\n${complaintText}`;
         return await OpenAIChatCompletion(prompt);
     }
 }

// Function to summarize complaint contents using OpenAI API
async function summarizeData(data) {
    if (data && data._source) {
        const complaintText = data._source.complaint_what_happened || 'No summary';
        const prompt = `Summarize this complaint in detail and be very specific, complete all sentences, and the answer must be anywhere between 1 to 3 sentences.\n\n${complaintText}`;
        return await OpenAIChatCompletion(prompt);
    }
}

// Read JSON file and process data
//Main function, which is run below
async function processJsonFile(fileToRead) {
    const filePath = path.resolve(__dirname, fileToRead); //retrives the JSON file from the same directory
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')); //parses data by JSON object in standard alphanumerical charset
        for (const item of data) { //loops through all the individual complaint items in the JSON file
               console.log(await isItAComplaint(item)); // Yes/No Complaint Categorization function
               console.log(await categorizeData(item)); // Data sub categorization function
               console.log(await summarizeData(item)); // Data summarization function
        }
    } catch (error) {
        console.error('Error reading or processing JSON file:', error);
    }
}

// Main function
/*----------------*/
readThis = "ruby_hackathon.json" //enter file to read, parse, and process here
processJsonFile(readThis); //using parameter so it can be configured to read any file with easy input
/*----------------*/
