#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setup() {
  console.log('🚀 Setting up Docu Genie Backend...\n');

  try {
    // Create uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error('❌ Failed to create uploads directory:', error.message);
      }
    }

    // Check if .env exists
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, 'env.example');
    
    try {
      await fs.access(envPath);
      console.log('✅ .env file already exists');
    } catch {
      try {
        const envExample = await fs.readFile(envExamplePath, 'utf8');
        await fs.writeFile(envPath, envExample);
        console.log('✅ Created .env file from template');
        console.log('⚠️  Please update .env with your Google AI API key and other settings');
      } catch (error) {
        console.error('❌ Failed to create .env file:', error.message);
      }
    }

    // Check for OpenRouter API key
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      if (!envContent.includes('OPENROUTER_API_KEY=your_openrouter_api_key_here')) {
        console.log('✅ OpenRouter API key appears to be configured');
      } else {
        console.log('⚠️  Please set your OpenRouter API key in .env file');
      }
    } catch {
      console.log('⚠️  Please create .env file and set your OpenRouter API key');
    }

    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update .env file with your OpenRouter API key');
    console.log('2. Run: npm run dev');
    console.log('3. Server will start on http://localhost:3001');
    console.log('4. Using GPT-OSS-20B model for AI responses\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
