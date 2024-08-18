const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
require('dotenv').config();
const path = require('path');  

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));  

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});
let pineconeIndex;

(async function initPinecone() {
    pineconeIndex = pinecone.Index('complaints-index');
})();

async function getEmbedding(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
    });
    return response.data[0].embedding;
}

async function upsertToPinecone(index, id, vector, metadata) {
    await index.upsert([
        {
            id: id,
            values: vector,
            metadata: metadata
        }
    ]);
}

async function queryPinecone(index, vector, topK = 5) {
    const queryResponse = await index.query({
        vector: vector,
        topK: topK,
        includeMetadata: true
    });
    return queryResponse.matches;
}
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
    const complaintId = data.complaint_id || `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const query = `
        INSERT INTO complaints (
            complaint_id, date_received, product_id, sub_product, issue, sub_issue, 
            company_id, state, zip_code, submitted_via, company_response, timely, 
            consumer_disputed, complaint_text, summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id`;
    
    const values = [
        complaintId,
        new Date(),
        productId,
        data.sub_product || null,
        data.issue || null,
        data.sub_issue || null,
        companyId,
        (data.state || '').substring(0, 2),  // Trim state to 2 characters
        data.zip_code || null,
        data.submitted_via || 'Web',
        data.company_response || 'Pending',
        data.timely || 'Yes',
        data.consumer_disputed || 'N/A',
        data.complaint_what_happened,
        summary
    ];

    const result = await pool.query(query, values);
    return result.rows[0].id;
}

async function summarizeData(data) {
    const prompt = `Summarize this complaint in detail and be very specific, complete all sentences, and the answer must be anywhere between 1 to 3 sentences.\n\n${data.complaint_what_happened}`;
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 125,
        temperature: 0.0,
    });
    return response.choices[0].message.content.trim();
}

// Routes
app.post('/api/complaints', async (req, res) => {
    try {
        const complaint = req.body;
        console.log('Received complaint:', JSON.stringify(complaint, null, 2));

        // Validate required fields
        const requiredFields = ['company', 'product', 'complaint_what_happened'];
        const missingFields = requiredFields.filter(field => !complaint[field]);
        
        if (missingFields.length > 0) {
            console.log('Missing required fields:', missingFields);
            return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
        }

        const companyId = await insertCompany(complaint.company);
        const productId = await insertProduct(complaint.product);
        
        const summary = await summarizeData(complaint);
        console.log('Generated summary:', summary);
        
        const complaintId = await insertComplaint(complaint, companyId, productId, summary);
        console.log('Inserted complaint, ID:', complaintId);
        
        const embedding = await getEmbedding(complaint.complaint_what_happened);
        await upsertToPinecone(pineconeIndex, complaintId.toString(), embedding, {
            text: complaint.complaint_what_happened,
            summary: summary,
            product: complaint.product,
            company: complaint.company
        });

        res.status(201).json({ message: 'Complaint processed successfully', complaintId });
    } catch (error) {
        console.error('Error processing complaint:', error);
        res.status(500).json({ error: 'An error occurred while processing the complaint', details: error.message });
    }
});

app.get('/api/complaints/similar', async (req, res) => {
    try {
        const { text, topK, currentComplaintId } = req.query;
        const embedding = await getEmbedding(text);
        const similarComplaints = await queryPinecone(pineconeIndex, embedding, parseInt(topK) || 5);
        
        // Filter out the current complaint if it's in the results
        const filteredComplaints = similarComplaints.filter(complaint => complaint.id !== currentComplaintId);

        // Fetch full complaint details from PostgreSQL
        const complaintDetails = await Promise.all(filteredComplaints.map(async (match) => {
            const { rows } = await pool.query('SELECT * FROM complaints WHERE id = $1', [match.id]);
            return { ...match, details: rows[0] };
        }));
        
        res.json(complaintDetails);
    } catch (error) {
        console.error('Error finding similar complaints:', error);
        res.status(500).json({ error: 'An error occurred while finding similar complaints' });
    }
});
// Test route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});