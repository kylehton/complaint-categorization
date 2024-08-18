import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const data = req.body;
    const filePath = path.join(process.cwd(), 'data', 'complaints.json');
    
    try {
      // Read existing data
      let existingData = [];
      if (fs.existsSync(filePath)) {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      
      // Append new data
      existingData.push(data);
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
      
      res.status(200).json({ message: 'Data saved successfully!' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}