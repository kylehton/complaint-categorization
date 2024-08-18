const { OpenAI } = require('openai');


const openai = new OpenAI({
  apiKey: ''
});

// Load JSON data
const data = {
  "_index": "complaint-public-v2",
  "_type": "_doc",
  "_id": "9005055",
  "_score": null,
  "_source": {
    "product": "Credit card",
    "complaint_what_happened": "Timely payments are always a priority for me, and I am certain about this. However, I am unsure why this company is reporting me as late in certain months, which should not be the case. According to USC 1666b, any billing error should be corrected, or they will be liable to pay me {$1000.00} for each account reporting inaccurately.",
    "date_sent_to_company": "2024-05-14T12:00:00-05:00",
    "issue": "Problem with a company's investigation into an existing problem",
    "sub_product": "General-purpose credit card or charge card",
    "zip_code": "37042",
    "tags": null,
    "complaint_id": "9005055",
    "timely": "Yes",
    "consumer_consent_provided": "Consent provided",
    "company_response": "Closed with explanation",
    "submitted_via": "Web",
    "company": "EQUIFAX, INC.",
    "date_received": "2024-05-14T12:00:00-05:00",
    "state": "TN",
    "consumer_disputed": "N/A",
    "company_public_response": null,
    "sub_issue": "Their investigation did not fix an error on your report"
  },
  "sort": [40]
};

async function openAIChatCompletion(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 5,
      temperature: 0.0
    });

    const classification = response.choices[0].message.content.trim();
    console.log(`Classification: ${classification}`);
    return classification;
  } catch (error) {
    console.error(`Error: ${error}`);
    throw error;
  }
}

async function categorizeData(data) {
  console.log(`Id: ${data._id}`);

  if (typeof data === 'object' && data._source) {
    const complaintText = data._source.complaint_what_happened || 'No complaint text available';
    const prompt = `Is the following text a complaint? Answer in 'Yes' or 'No'\n\n${complaintText}`;
    return await openAIChatCompletion(prompt);
  }
}

async function summarizeData(data) {
  console.log(`Id: ${data._id}`);

  if (typeof data === 'object' && data._source) {
    const complaintText = data._source.complaint_what_happened || 'No complaint text available';
    const prompt = `Summarize this complaint in detail and be very specific, use full sentences.\n\n${complaintText}`;
    return await openAIChatCompletion(prompt);
  }
}

(async () => {
  try {
    console.log(await categorizeData(data));
    console.log(await summarizeData(data));
  } catch (error) {
    console.error(`Error: ${error}`);
  }
})();