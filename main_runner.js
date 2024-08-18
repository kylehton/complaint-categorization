require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

/*const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
*/
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

async function OpenAIChatCompletion(prompt) {
    try {
        const response = await client.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-3.5-turbo',
            max_tokens: 100,
            temperature: 0.0,
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenAI API request error:', error);
        throw error;
    }
}

async function categorizeData(data) {
    if (data && data._source) {
        const complaintText = data._source.issue || 'No complaint text available';
        const prompt = `Create a category based on the issue, but if possible and applicable, use the categories already created. It should be less than 5 words'\n\n${complaintText}`;
        return await OpenAIChatCompletion(prompt);
    }
}

async function summarizeData(data) {
    if (data && data._source) {
        const complaintText = data._source.complaint_what_happened || 'No summary';
        const prompt = `Summarize this complaint in detail and be very specific, complete all sentences, and the answer must be anywhere between 1 to 3 sentences.\n\n${complaintText}`;
        return await OpenAIChatCompletion(prompt);
    }
}

// insert company into database
async function insertCompany(name) {
    const query = 'INSERT INTO companies (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id';
    const result = await pool.query(query, [name]);
    return result.rows[0].id;
}

// nsert product into database
async function insertProduct(name) {
    const query = 'INSERT INTO products (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id';
    const result = await pool.query(query, [name]);
    return result.rows[0].id;
}

// insert complaint into database
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

// inserts category and link to complaint
async function insertCategory(name, complaintId) {
    const categoryQuery = 'INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id';
    const categoryResult = await pool.query(categoryQuery, [name]);
    const categoryId = categoryResult.rows[0].id;

    const linkQuery = 'INSERT INTO complaint_categories (complaint_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING';
    await pool.query(linkQuery, [complaintId, categoryId]);
}

// process JSON file and insert into database
async function processJsonFile() {
    const filePath = path.resolve(__dirname, 'ruby_hackathon.json');
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const item of data) {
            const companyId = await insertCompany(item._source.company);
            const productId = await insertProduct(item._source.product);
            
            const summary = await summarizeData(item);
            console.log(`Summary: ${summary}`);
            
            const complaintId = await insertComplaint(item, companyId, productId, summary);

            const category = await categorizeData(item);
            console.log(`Category: ${category}`);
            await insertCategory(category, complaintId);
        }
    } catch (error) {
        console.error('Error reading or processing JSON file:', error);
    } finally {
        await pool.end();
    }
}

processJsonFile();