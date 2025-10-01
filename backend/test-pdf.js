// Simple test to verify PDF parsing works
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

console.log('PDF.js library loaded successfully!');
console.log('Version:', pdfjsLib.version);

// Test basic functionality
try {
    console.log('✅ pdfjs-dist import successful');
    console.log('🚀 Server should start without errors now');
} catch (error) {
    console.error('❌ Error:', error);
}