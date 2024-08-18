'use client';

import {useState} from 'react';
import { Container, Box, Typography, Button, TextField } from "@mui/material";
import Head from 'next/head';

export default function Home() {

  const [formData, setFormData] = useState({
    product: '',
    dateSent: '',
    issueType: '',
    issueDescription: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/saveComplaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      console.log('Success:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Container
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end', // Align items to the bottom
        alignItems: 'center', // Center items horizontally
      }}
    >
      <Head>
        <title>File a Complaint</title>
        <meta name="description" content="Complaint Form" />
      </Head>
      
      <Typography variant="h5" component="h1" gutterBottom align="center" marginBottom="60px" fontSize={40}>
          Ruby Hackathon Project
        </Typography>

      {/* Box for Form */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '600px',
          p: 3,
          borderRadius: '6px 6px 0 0', // Round only top corners
          boxShadow: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center">
          File a Complaint
        </Typography>
        
        <TextField
          label="Product"
          variant="outlined"
          fullWidth
          name="product"
          value={formData.product}
          onChange={handleChange}
        />

        <TextField
          variant="outlined"
          fullWidth
          type="date"
          name="dateSent"
          value={formData.dateSent}
          onChange={handleChange}
        />

        <TextField
          label="Issue Type"
          variant="outlined"
          fullWidth
          name="issueType"
          value={formData.issueType}
          onChange={handleChange}
        />

        <TextField
          label="Issue Description"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          name="issueDescription"
          value={formData.issueDescription}
          onChange={handleChange}
        />

        <Button
        type="submit"
          variant="contained"
          color="primary"
        >
          Submit
        </Button>
      </Box>
    </Container>
  );
}
