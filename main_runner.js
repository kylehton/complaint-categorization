require('dotenv').config();
<<<<<<< HEAD

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const client = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
});

// Function to perform OpenAI API request
=======
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { Pinecone } = require('@pinecone-database/pinecone');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

let pineconeIndex;

async function initPinecone() {
    pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
}

>>>>>>> 9ce1e6c666e8b7c51919bdeada91bf773175a3ed
async function OpenAIChatCompletion(prompt) {
    try {
        const response = await client.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
<<<<<<< HEAD
            model: 'gpt-3.5-turbo', // using the GPT-3.5-turbo model to maximize token usage for large JSON file
            max_tokens: 115, //limits token usage to 100 per API call to prevent overuse, but enough to generate good responses
            temperature: 0.0,// low temp variability to minimize varietal results, especially for sub-categorization (so more of them are categorized as similarly as possible)
=======
            model: 'gpt-3.5-turbo',
            max_tokens: 125,
            temperature: 0.0,
>>>>>>> 9ce1e6c666e8b7c51919bdeada91bf773175a3ed
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API request error:', error);
        throw error;
    }
}

<<<<<<< HEAD
// Function to categorize whether it is complaint or not using OpenAI API
async function isItAComplaint(data) {
    console.log(`ID: ${data['_id']}`);
    if (data && data._source) {
        const complaintText = data._source.complaint_what_happened || 'Unidentifiable';
        const prompt = `Is the following text a complaint? Answer in 'Yes' or 'No'\n\n${complaintText}`;
=======
async function getEmbedding(text) {
    try {
        const response = await client.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('OpenAI embedding error:', error);
        throw error;
    }
}

async function upsertToPinecone(id, vector, metadata) {
    await pineconeIndex.upsert([
        {
            id: id,
            values: vector,
            metadata: metadata
        }
    ]);
}

async function categorizeData(data) {
    if (data && data._source) {
        const complaintText = data._source.issue || 'No complaint text available';
        const prompt = `Create a category based on the issue, but if possible and applicable, use the categories already created. It should be less than 5 words'\n\n${complaintText}`;
>>>>>>> 9ce1e6c666e8b7c51919bdeada91bf773175a3ed
        return await OpenAIChatCompletion(prompt);
    }
}

<<<<<<< HEAD
// Function to categorize data based on issue using OpenAI API
async function categorizeData(data) {
     if (data && data._source) {
         const complaintText = data._source.issue || 'No complaint text available';
         const prompt = `Create a category based on the issue, but if possible and applicable, use the categories already created. It should be less than 5 words'\n\n${complaintText}`;
         return await OpenAIChatCompletion(prompt);
     }
 }

// Function to summarize complaint contents using OpenAI API
=======
>>>>>>> 9ce1e6c666e8b7c51919bdeada91bf773175a3ed
async function summarizeData(data) {
    if (data && data._source) {
        const complaintText = data._source.complaint_what_happened || 'No summary';
        const prompt = `Summarize this complaint in detail and be very specific, complete all sentences, and the answer must be anywhere between 1 to 3 sentences.\n\n${complaintText}`;
        return await OpenAIChatCompletion(prompt);
    }
}

<<<<<<< HEAD
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
=======
async function insertCompany(name) {
    const query = 'INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id';
    const result = await pool.query(query, [name]);
    return result.rows[0].id;
}

async function insertProduct(name) {
    const query = 'INSERT INTO products (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id';
    const result = await pool.query(query, [name]);
    return result.rows[0].id;
}

async function insertComplaint(data, companyId, productId, summary) {
    const query = `
        INSERT INTO complaints (
            complaint_id, date_received, product_id, sub_product, issue, sub_issue, 
            company_id, state, zip_code, submitted_via, company_response, timely, 
            consumer_disputed, complaint_text, summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (complaint_id) DO UPDATE SET
            date_received = $2, product_id = $3, sub_product = $4, issue = $5, 
            sub_issue = $6, company_id = $7, state = $8, zip_code = $9, 
            submitted_via = $10, company_response = $11, timely = $12, 
            consumer_disputed = $13, complaint_text = $14, summary = $15
        RETURNING id`;
    
    const values = [
        data._id,
        new Date(data._source.date_received),
        productId,
        data._source.sub_product,
        data._source.issue,
        data._source.sub_issue,
        companyId,
        data._source.state,
        data._source.zip_code,
        data._source.submitted_via,
        data._source.company_response,
        data._source.timely,
        data._source.consumer_disputed,
        data._source.complaint_what_happened,
        summary
    ];

    const result = await pool.query(query, values);
    return result.rows[0].id;
}

async function insertCategory(name, complaintId) {
    const categoryQuery = 'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id';
    const categoryResult = await pool.query(categoryQuery, [name]);
    const categoryId = categoryResult.rows[0].id;

    const linkQuery = 'INSERT INTO complaint_categories (complaint_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING';
    await pool.query(linkQuery, [complaintId, categoryId]);
}

async function processComplaint(item) {
    if (!item._source) {
        console.error('Invalid complaint structure:', item);
        return;
    }

    const companyId = await insertCompany(item._source.company);
    const productId = await insertProduct(item._source.product);
    
    const summary = await summarizeData(item);
    console.log(`Summary: ${summary}`);
    
    const complaintId = await insertComplaint(item, companyId, productId, summary);

    const category = await categorizeData(item);
    console.log(`Category: ${category}`);
    await insertCategory(category, complaintId);

    // Generate embedding and store in Pinecone
    const embedding = await getEmbedding(item._source.complaint_what_happened);
    await upsertToPinecone(complaintId.toString(), embedding, {
        text: item._source.complaint_what_happened,
        summary: summary,
        category: category,
        product: item._source.product,
        company: item._source.company
    });

    console.log(`Processed complaint ID: ${complaintId}`);
}
async function processJsonFile() {
    const filePath = path.resolve(__dirname, 'ruby_hackathon_data.json');
    try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(rawData);
        console.log(`Total complaints to process: ${data.length}`);

        await initPinecone();

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            console.log(`Processing complaint ${i + 1} of ${data.length}`);
            await processComplaint(item);
        }

        console.log('All complaints processed successfully');
    } catch (error) {
        console.error('Error reading or processing JSON file:', error);
    } finally {
        await pool.end();
    }
}

processJsonFile();
>>>>>>> 9ce1e6c666e8b7c51919bdeada91bf773175a3ed
