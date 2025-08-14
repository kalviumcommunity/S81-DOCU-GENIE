import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Check:');
console.log('📝 JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('📝 OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('📝 GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('📝 PORT:', process.env.PORT || '3001 (default)');

if (!process.env.JWT_SECRET) {
  console.log('\n❌ CRITICAL: JWT_SECRET is missing - authentication will fail');
}

if (!process.env.OPENROUTER_API_KEY) {
  console.log('\n❌ CRITICAL: OPENROUTER_API_KEY is missing - AI responses will fail');
}

if (!process.env.GOOGLE_API_KEY) {
  console.log('\n⚠️ WARNING: GOOGLE_API_KEY is missing - OCR will use fallback');
}

console.log('\n💡 Solution: Create a .env file in the backend directory with:');
console.log('JWT_SECRET=your_secret_key_here');
console.log('OPENROUTER_API_KEY=your_openrouter_key_here');
console.log('GOOGLE_API_KEY=your_google_key_here');
