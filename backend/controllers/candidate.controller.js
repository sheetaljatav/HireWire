// POST /candidates → Add a candidate (name, email, phone, resume URL).

import cloudinary from '../config/cloudnary.js';
import Candidate from '../models/candidates.model.js';
import PDFParser from "pdf2json";

export const extractTextFromPDF = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (err) => reject(err.parserError));
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      let text = "";
      pdfData.Pages.forEach((page) => {
        page.Texts.forEach((t) => {
          text += decodeURIComponent(t.R[0].T) + " ";
        });
      });
      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
};

// Improved name extraction function
export const extractNameFromText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  console.log('Parse Resume - text preview:', text.substring(0, 200));
  
  // Strategy 1: Handle merged text by looking for CamelCase names at the beginning
  const mergedNamePattern = /^([A-Z][a-z]+[A-Z][a-z]+(?:[A-Z][a-z]+)?)/;
  const mergedMatch = text.match(mergedNamePattern);
  if (mergedMatch) {
    const mergedName = mergedMatch[1];
    // Split CamelCase into separate words
    const splitName = mergedName.replace(/([a-z])([A-Z])/g, '$1 $2');
    console.log('Found merged name:', mergedName, '-> split as:', splitName);
    if (isValidNameStrict(splitName)) {
      console.log('Parse Resume - extracted name:', splitName);
      return splitName;
    }
  }
  
  // Strategy 2: Look for explicit name labels
  const labelPatterns = [
    /(?:NAME|Name|FULL NAME|Full Name|CANDIDATE NAME)\s*:?\s*([A-Z][a-zA-Z'\-.]+(?: [A-Z][a-zA-Z'\-.]*){1,3})/i,
    /^\s*([A-Z][a-zA-Z'\-.]+(?: [A-Z][a-zA-Z'\-.]*){1,3})\s*$/m // Name on its own line
  ];
  
  for (const pattern of labelPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && isValidNameStrict(match[1].trim())) {
      console.log('Found name via label pattern:', match[1].trim());
      console.log('Parse Resume - extracted name:', match[1].trim());
      return match[1].trim();
    }
  }
  
  // Strategy 3: Split into logical chunks and look for names
  const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  // Check first few lines for standalone names
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    
    // Skip obvious section headers
    if (isObviousSectionHeader(line)) {
      continue;
    }
    
    // Check if line contains only a name (2-4 words, all capitalized)
    const words = line.split(/\s+/).filter(word => word.length > 0);
    if (words.length >= 2 && words.length <= 4) {
      const potentialName = words.join(' ');
      if (isValidNameStrict(potentialName)) {
        console.log(`Found name on line ${i}:`, potentialName);
        console.log('Parse Resume - extracted name:', potentialName);
        return potentialName;
      }
    }
  }
  
  // Strategy 4: Look within first words, but prioritize those before section keywords
  const allWords = text.replace(/\s+/g, ' ').split(/\s+/).slice(0, 30);
  
  // Find the position of first section keyword
  const sectionKeywords = ['technical', 'skills', 'experience', 'education', 'programming', 'languages'];
  let sectionStartIndex = allWords.length;
  
  for (let i = 0; i < allWords.length; i++) {
    if (sectionKeywords.some(keyword => allWords[i].toLowerCase().includes(keyword))) {
      sectionStartIndex = i;
      break;
    }
  }
  
  console.log(`Section starts at word ${sectionStartIndex}, searching in first ${sectionStartIndex} words`);
  
  // Only look for names before the section starts
  const wordsBeforeSection = Math.min(sectionStartIndex, 15);
  
  for (let i = 0; i < wordsBeforeSection - 1; i++) {
    for (let len = 2; len <= 4 && i + len <= wordsBeforeSection; len++) {
      const candidate = allWords.slice(i, i + len).join(' ');
      if (isValidNameStrict(candidate)) {
        console.log('Found name before section:', candidate);
        console.log('Parse Resume - extracted name:', candidate);
        return candidate;
      }
    }
  }
  
  console.log('Parse Resume - extracted name: (none)');
  return '';
};

// Helper function to identify obvious section headers
const isObviousSectionHeader = (text) => {
  const lowerText = text.toLowerCase().trim();
  
  // Direct matches for common section headers
  const exactHeaders = [
    'technical skills', 'professional skills', 'core skills', 'skills',
    'work experience', 'professional experience', 'employment history', 'experience',
    'education', 'educational background', 'academic background',
    'programming languages', 'languages', 'technologies',
    'projects', 'key projects', 'notable projects',
    'summary', 'professional summary', 'career summary', 'profile',
    'contact information', 'contact', 'personal information',
    'certifications', 'awards', 'achievements', 'qualifications'
  ];
  
  if (exactHeaders.includes(lowerText)) return true;
  
  // Check for combined words like "TechnicalSkills"
  const combinedPatterns = [
    /^technicalskills/i,
    /^professionalskills/i,
    /^workexperience/i,
    /^programminglanguages/i,
    /^contactinformation/i,
    /technicalskills/i,  // anywhere in text
    /programminglanguages/i  // anywhere in text
  ];
  
  if (combinedPatterns.some(pattern => pattern.test(text))) return true;
  
  // Check if it contains multiple technical keywords
  const techKeywords = ['java', 'python', 'javascript', 'react', 'node', 'sql', 'html', 'css'];
  const keywordCount = techKeywords.filter(keyword => lowerText.includes(keyword)).length;
  
  return keywordCount >= 3;
};

// Strict name validation function
const isValidNameStrict = (name) => {
  if (!name || name.length < 2 || name.length > 50) return false;
  
  const trimmedName = name.trim();
  const words = trimmedName.split(/\s+/);
  
  // Must have 2-4 words
  if (words.length < 2 || words.length > 4) {
    // console.log(`Rejected "${name}" - wrong word count: ${words.length}`);
    return false;
  }
  
  // Each word must start with a capital letter and contain only letters, apostrophes, or hyphens
  for (const word of words) {
    if (!/^[A-Z][a-zA-Z'\-]*$/.test(word)) {
      // console.log(`Rejected "${name}" - invalid word format: "${word}"`);
      return false;
    }
  }
  
  // Check against common non-name words (expanded list)
  const nonNameWords = [
    'technical', 'skills', 'professional', 'experience', 'education', 'work',
    'languages', 'programming', 'software', 'developer', 'engineer', 'manager',
    'summary', 'profile', 'contact', 'information', 'background', 'career',
    'projects', 'achievements', 'qualifications', 'certifications', 'awards',
    'java', 'python', 'javascript', 'react', 'node', 'sql', 'html', 'css',
    'senior', 'junior', 'lead', 'principal', 'architect', 'specialist', 'analyst',
    'frameworks', 'libraries', 'databases', 'tools', 'technologies', 'core',
    'web', 'mobile', 'frontend', 'backend', 'fullstack', 'stack'
  ];
  
  const lowerWords = words.map(w => w.toLowerCase());
  const hasNonNameWord = lowerWords.some(word => nonNameWords.includes(word));
  
  if (hasNonNameWord) {
    // console.log(`Rejected "${name}" - contains non-name word`);
    return false;
  }
  
  // Additional patterns to reject
  if (/\d/.test(trimmedName)) { // contains digits
    // console.log(`Rejected "${name}" - contains digits`);
    return false;
  }
  
  if (/@/.test(trimmedName)) { // contains email symbol
    // console.log(`Rejected "${name}" - contains @ symbol`);
    return false;
  }
  
  // console.log(`Accepted name: "${name}"`);
  return true;
};

// Keep the original function for backward compatibility
const isValidName = isValidNameStrict;


export const addCandidate = async (req, res) => {
    const { name, email, phone } = req.body;
    const file = req.file;
    console.log(file, name, email, phone);

    if (!name || !email || !phone || !file) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const hasCloudinary = Boolean(process.env.CLOUD_NAME && process.env.API_KEY && process.env.API_SECRET);

        // Upload resume to Cloudinary (if configured) or keep local file path
        let resumeUrl = '';
        if (hasCloudinary && file && file.buffer) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { resource_type: "auto", folder: "resumes" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(file.buffer);
            });
            resumeUrl = result.secure_url;
        } else {
            // Local upload fallback: served via /uploads
            // Build absolute URL so the frontend (on a different port) can open it directly
            if (file?.path) {
                const origin = `${req.protocol}://${req.get('host')}`;
                resumeUrl = `${origin}/uploads/${file.filename}`;
            } else {
                resumeUrl = '';
            }
        }

        // Parse PDF resume text
        let resumeText = "";
        let extractedName = "";
        let extractedEmail = "";
        let extractedPhone = "";

        try {
            if (file.mimetype === 'application/pdf') {
                // Parse PDF using pdf2json
                let pdfBuffer = file.buffer;
                
                // If using disk storage, read the file
                if (!pdfBuffer && file.path) {
                    const fs = await import('fs');
                    pdfBuffer = fs.default.readFileSync(file.path);
                }
                
                if (pdfBuffer) {
                  resumeText = await extractTextFromPDF(pdfBuffer);
                }
                
            // Extract info from resume text
            if (resumeText) {
                console.log('Resume text preview:', resumeText.substring(0, 200));
                // Name: Look for capitalized words (improved pattern)
                extractedName = extractNameFromText(resumeText);
                console.log('Extracted name:', extractedName);
                    
                    // Email
                    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                    if (emailMatch) extractedEmail = emailMatch[0];
                    
                    // Phone
                    const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                    if (phoneMatch) extractedPhone = phoneMatch[0];
                }
            }
        } catch (pdfError) {
            console.error("PDF parsing error:", pdfError);
            // Continue with provided data if PDF parsing fails
        }

        // Use extracted data if available, otherwise use manual input
        const finalName = extractedName || name;
        const finalEmail = extractedEmail || email;
        const finalPhone = extractedPhone || phone;

        // Check for missing fields and prompt if needed
        const missingFields = [];
        if (!finalName || finalName.trim().length < 2) missingFields.push('name');
        if (!finalEmail || !finalEmail.includes('@')) missingFields.push('email');
        if (!finalPhone || finalPhone.length < 10) missingFields.push('phone');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Please provide missing information: ${missingFields.join(', ')}`,
                missingFields,
                extractedData: { name: extractedName, email: extractedEmail, phone: extractedPhone },
                resumeText: resumeText.substring(0, 500) // First 500 chars for context
            });
        }

        const candidate = new Candidate({ 
            name: finalName, 
            email: finalEmail, 
            phone: finalPhone, 
            resumeUrl,
            resumeText: resumeText.substring(0, 2000) // Store first 2000 chars
        });
        await candidate.save();
        res.status(201).json({ 
            success: true,
            message: "Candidate added successfully.", 
            candidate: {
                _id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                resumeUrl: candidate.resumeUrl,
                status: candidate.status
            }
        });
    } catch (error) {
        console.error("Error adding candidate:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

// get all the candidates only for the interviewer can see
// Parse resume and extract data without saving candidate
export const parseResume = async (req, res) => {
    const file = req.file;
    
    console.log('Parse resume request received');
    console.log('File:', file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size, hasBuffer: !!file.buffer, hasPath: !!file.path } : 'No file');
    
    if (!file) {
        return res.status(400).json({ error: "Resume file is required." });
    }

    try {
        let resumeText = "";
        let extractedName = "";
        let extractedEmail = "";
        let extractedPhone = "";

        if (file.mimetype === 'application/pdf') {
            // Parse PDF using pdf2json
            let pdfBuffer = file.buffer;
            
            // If using disk storage, read the file
            if (!pdfBuffer && file.path) {
                const fs = await import('fs');
                pdfBuffer = fs.default.readFileSync(file.path);
            }
            
            if (pdfBuffer) {
                resumeText = await extractTextFromPDF(pdfBuffer);
            }
            
            // Extract info from resume text
            if (resumeText) {
                console.log('Parse Resume - text preview:', resumeText.substring(0, 200));
                // Name: Look for capitalized words (improved pattern)
                extractedName = extractNameFromText(resumeText);
                console.log('Parse Resume - extracted name:', extractedName);
                
                // Email
                const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch) extractedEmail = emailMatch[0];
                
                // Phone
                const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                if (phoneMatch) extractedPhone = phoneMatch[0];
            }
        }

        console.log('Extracted data:', { name: extractedName, email: extractedEmail, phone: extractedPhone });
        console.log('Resume text length:', resumeText.length);

        res.status(200).json({ 
            success: true,
            extractedData: { 
                name: extractedName, 
                email: extractedEmail, 
                phone: extractedPhone 
            },
            resumeText: resumeText.substring(0, 500) // First 500 chars for context
        });
    } catch (error) {
        console.error("Error parsing resume:", error);
        res.status(500).json({ error: "Failed to parse resume." });
    }
};

export const getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.status(200).json({ success: true, candidates });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
