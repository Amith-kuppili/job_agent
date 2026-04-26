const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const authStatePath = path.resolve(process.cwd(), 'auth.json');

app.use(express.json());

app.post('/apply', async (req, res) => {
  const { url } = req.body;

  const result = await automateJobApplication(url);

  res.json(result);
});

app.listen(3000);

// Load your personal data
const data = {
  personal: {
    firstName: "Amith",
    lastName: "Kuppili",
    phone: "8179223135",
    email: "amithkuppili@gmail.com",
    city: "vizianagram",
    state: "Andhra Pradesh",
    zip: "531162",
    country: "India",
    linkedin: "https://www.linkedin.com/in/k-amith-91162b349/",
    github: "https://github.com/Amith-kuppili"
  },
  experience: [
    {
      title: "Full Stack Web Development Intern",
      company: "Slash Mark",
      start: "Apr 2025",
      end: "Jun 2025",
      location: "India",
      description: "Worked on real-time client projects using MERN stack and built scalable web applications."
    },
    {
      title: "AI & ML Intern",
      company: "YBI Foundation",
      start: "Dec 2024",
      end: "Feb 2025",
      location: "India",
      description: "Worked with real-world datasets and applied machine learning models using Python for data analysis."
    }
  ],
  education: [
    {
      degree: "B.Tech in Electronics and Communication Engineering",
      institution: "Lendi Institute of Engineering and Technology",
      year: "2026"
    }
  ],
  projects: [
    {
      title: "AI Automation Workflow for Video Generation",
      description: "Designed an automation workflow using n8n to generate videos through API integrations and event-driven processes."
    },
    {
      title: "Stock Price Analytics & Prediction System",
      description: "Built a data-driven system using Python and time-series analysis for real-time stock prediction and insights."
    },
    {
      title: "Wearable Infrared Body Camera System",
      description: "Developed an embedded system using infrared and ultra-wide lens for safety monitoring and helmet detection."
    }
  ],
  skills: {
    languages: ["Python", "Java", "SQL"],
    tools: ["n8n", "REST APIs", "Docker", "Power BI", "Git"],
    concepts: ["Data Analysis", "Automation", "APIs", "Data Structures", "Problem Solving"]
  }
};

// Utility functions
async function safeClick(page, selector, opts = {}) {
  try {
    const el = await page.$(selector);
    if (el) {
      await el.click(opts);
      return true;
    }
    console.warn(`⚠️  Selector not found: ${selector}`);
    return false;
  } catch (error) {
    console.warn(`⚠️  Click failed on ${selector}:`, error.message);
    return false;
  }
}

async function safeFill(page, selector, value) {
  try {
    const el = await page.$(selector);
    if (el) {
      await el.fill(value);
      return true;
    }
    console.warn(`⚠️  Input not found: ${selector}`);
    return false;
  } catch (error) {
    console.warn(`⚠️  Fill failed on ${selector}:`, error.message);
    return false;
  }
}

async function safeSelect(page, selector, value) {
  try {
    const el = await page.$(selector);
    if (el) {
      await el.selectOption(value);
      return true;
    }
    console.warn(`⚠️  Select not found: ${selector}`);
    return false;
  } catch (error) {
    console.warn(`⚠️  Select failed on ${selector}:`, error.message);
    return false;
  }
}

async function waitForAndClick(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
    return true;
  } catch (error) {
    console.warn(`⚠️  Wait and click failed for ${selector}:`, error.message);
    return false;
  }
}

async function detectCaptcha(page) {
  const content = await page.content();
  return content.toLowerCase().includes('captcha');
}

// Resume selection logic
async function selectResume(page, jobTitle = '') {
  const title = jobTitle.toLowerCase();
  let resumeFile = 'Amith_resume.pdf'; // default

  if (/sas|power[- ]?bi|analytics|bi|data science|ml|ai/.test(title)) {
    resumeFile = 'RESUME AMITH.pdf';
  } else if (/automation|n8n|docker|devops/.test(title)) {
    resumeFile = 'Automation_resume.pdf';
  } else if (/business intelligence|bi|power bi/.test(title)) {
    resumeFile = 'Automation_BI_resume.pdf';
  }

  const root = process.cwd();
  const resumePath = path.resolve(root, resumeFile);
  
  // Check if file exists
  if (!fs.existsSync(resumePath)) {
    console.warn(`⚠️  Resume file not found: ${resumePath}`);
    return 'Amith_resume.pdf'; // fallback to default
  }

  console.log(`📄 Selected resume: ${resumeFile}`);
  return resumePath;
}

// Portal-specific handlers
const portalHandlers = {
  // LinkedIn handler
  async handleLinkedIn(page, jobUrl, missingFields) {
    console.log('🚀 Processing LinkedIn job...');
    
    // Check if logged in
    const loginBtn = await page.$('text=Sign in');
    if (loginBtn) {
      console.log('🔐 Logging into LinkedIn...');
      await loginBtn.click();
      await page.waitForSelector('input[name="session_key"]', { timeout: 5000 });
      
      await safeFill(page, 'input[name="session_key"]', data.personal.email);
      await safeFill(page, 'input[name="session_password"]', 'YOUR_LINKEDIN_PASSWORD'); // Replace with actual password
      await safeClick(page, 'button[type="submit"]');
      
      await page.waitForNavigation();
      await page.context().storageState({ path: authStatePath });
    }

    // Look for Easy Apply button
    const easyApplyBtn = await page.$('text=Easy Apply');
    if (easyApplyBtn) {
      console.log('🎯 Found Easy Apply button');
      await easyApplyBtn.click();
      
      // Wait for application modal
      await page.waitForSelector('.jobs-easy-apply-modal', { timeout: 8000 });
      
      // Handle multi-step form
      let currentStep = 1;
      while (true) {
        console.log(`📝 Processing step ${currentStep}`);
        
        // Check for file upload
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          const resumePath = await selectResume(page, await page.title());
          await page.setInputFiles('input[type="file"]', resumePath);
          console.log('✅ Resume uploaded');
        }
        
        // Fill personal information
        await this.fillPersonalInfo(page, missingFields);
        
        // Look for next button
        const nextBtn = await page.$('button:has-text("Next")');
        const reviewBtn = await page.$('button:has-text("Review")');
        const submitBtn = await page.$('button:has-text("Submit")');
        
        if (submitBtn) {
          console.log('✅ Ready to submit');
          await submitBtn.click();
          break;
        } else if (reviewBtn) {
          await reviewBtn.click();
        } else if (nextBtn) {
          await nextBtn.click();
        } else {
          console.log('❌ No navigation buttons found');
          break;
        }
        
        await page.waitForTimeout(2000);
        currentStep++;
        
        if (currentStep > 10) { // Safety break
          console.log('⚠️  Too many steps, breaking');
          break;
        }
      }
    }
  },

  // Indeed handler
  async handleIndeed(page, jobUrl, missingFields) {
    console.log('🚀 Processing Indeed job...');
    
    // Check for apply button
    const applyBtn = await page.$('text=Apply now');
    if (applyBtn) {
      await applyBtn.click();
      
      // Wait for application form
      await page.waitForSelector('form', { timeout: 8000 });
      
      // Fill personal info
      await this.fillPersonalInfo(page, missingFields);
      
      // Handle resume upload
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const resumePath = await selectResume(page, await page.title());
        await page.setInputFiles('input[type="file"]', resumePath);
      }
      
      // Submit application
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('✅ Indeed application submitted');
      }
    }
  },

  // Generic portal handler
  async handleGenericPortal(page, jobUrl, missingFields) {
    console.log('🚀 Processing generic job portal...');
    
    // Look for apply buttons
    const applySelectors = [
      'text=Apply',
      'text=Apply Now',
      'text=Apply for this job',
      'button[type="submit"]',
      'input[type="submit"]'
    ];
    
    for (const selector of applySelectors) {
      const applyBtn = await page.$(selector);
      if (applyBtn) {
        await applyBtn.click();
        break;
      }
    }
    
    // Wait for form
    await page.waitForSelector('form, input, textarea, select', { timeout: 10000 });
    
    // Fill all possible fields
    await this.fillPersonalInfo(page, missingFields);
    await this.fillExperience(page, missingFields);
    await this.fillEducation(page, missingFields);
    
    // Handle file upload
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const resumePath = await selectResume(page, await page.title());
      await page.setInputFiles('input[type="file"]', resumePath);
    }
    
    // Submit
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('✅ Application submitted');
    }
  },

  // Field filling methods
  async fillPersonalInfo(page, missingFields) {
    console.log('👤 Filling personal information...');
    
    const fieldMappings = {
      'firstName': ['first name', 'fname', 'given name'],
      'lastName': ['last name', 'lname', 'surname'],
      'phone': ['phone', 'mobile', 'telephone'],
      'email': ['email', 'e-mail'],
      'city': ['city', 'town'],
      'state': ['state', 'province'],
      'zip': ['zip', 'postal code', 'pincode'],
      'country': ['country'],
      'linkedin': ['linkedin', 'linkedin profile'],
      'github': ['github', 'github profile']
    };
    
    for (const [field, aliases] of Object.entries(fieldMappings)) {
      for (const alias of aliases) {
        const selectors = [
          `input[placeholder*="${alias}" i]`,
          `input[name*="${alias}" i]`,
          `input[id*="${alias}" i]`,
          `textarea[placeholder*="${alias}" i]`,
          `textarea[name*="${alias}" i]`,
          `textarea[id*="${alias}" i]`
        ];
        
        for (const selector of selectors) {
          const element = await page.$(selector);
          if (element && data.personal[field]) {
            await element.fill(data.personal[field]);
            console.log(`✅ Filled ${field}`);
            break;
          }

          if (!element) {
            missingFields.push(alias);
          }
        }
      }
    }
  },

  async fillExperience(page, missingFields) {
    console.log('💼 Filling experience...');
    
    // Look for experience sections
    const expSections = await page.$$('section, div:has(> h2, > h3):has-text("experience")');
    
    for (const section of expSections) {
      // Try to add new experience
      const addBtn = await section.$('button:has-text("Add"), button:has-text("+")');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        
        // Fill experience fields
        await this.fillExperienceFields(page, missingFields);
      }
    }
  },

  async fillExperienceFields(page, missingFields) {
    const exp = data.experience[0]; // Use first experience
    const fieldMappings = {
      'title': ['title', 'position', 'role'],
      'company': ['company', 'employer', 'organization'],
      'start': ['start date', 'from', 'begin'],
      'end': ['end date', 'to', 'until'],
      'location': ['location', 'city', 'country'],
      'description': ['description', 'responsibilities', 'duties']
    };
    
    for (const [field, aliases] of Object.entries(fieldMappings)) {
      for (const alias of aliases) {
        const selectors = [
          `input[placeholder*="${alias}" i]`,
          `input[name*="${alias}" i]`,
          `textarea[placeholder*="${alias}" i]`,
          `textarea[name*="${alias}" i]`
        ];
        
        for (const selector of selectors) {
          const element = await page.$(selector);
          if (element && exp[field]) {
            await element.fill(exp[field]);
            break;
          }

          if (!element) {
            missingFields.push(alias);
          }
        }
      }
    }
  },

  async fillEducation(page, missingFields) {
    console.log('🎓 Filling education...');
    
    const eduSections = await page.$$('section, div:has(> h2, > h3):has-text("education")');
    
    for (const section of eduSections) {
      const addBtn = await section.$('button:has-text("Add"), button:has-text("+")');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        
        await this.fillEducationFields(page, missingFields);
      }
    }
  },

  async fillEducationFields(page, missingFields) {
    const edu = data.education[0];
    const fieldMappings = {
      'degree': ['degree', 'qualification', 'course'],
      'institution': ['institution', 'school', 'college', 'university'],
      'year': ['year', 'graduation year', 'completion year']
    };
    
    for (const [field, aliases] of Object.entries(fieldMappings)) {
      for (const alias of aliases) {
        const selectors = [
          `input[placeholder*="${alias}" i]`,
          `input[name*="${alias}" i]`,
          `textarea[placeholder*="${alias}" i]`,
          `textarea[name*="${alias}" i]`
        ];
        
        for (const selector of selectors) {
          const element = await page.$(selector);
          if (element && edu[field]) {
            await element.fill(edu[field]);
            break;
          }

          if (!element) {
            missingFields.push(alias);
          }
        }
      }
    }
  }
};

// Main function
async function automateJobApplication(jobUrl) {
  const missingFields = [];
  let detectedPortal = 'generic';

  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 100 // Slow down for better observation
  });

  const contextOptions = {
    viewport: { width: 1280, height: 720 }
  };

  if (fs.existsSync(authStatePath)) {
    contextOptions.storageState = authStatePath;
  }

  const context = await browser.newContext(contextOptions);
  
  const page = await context.newPage();
  
  try {
    console.log(`🌐 Navigating to: ${jobUrl}`);
    await page.goto(jobUrl, { waitUntil: 'networkidle' });

    if (await detectCaptcha(page)) {
      return {
        status: 'blocked',
        reason: 'captcha'
      };
    }
    
    // Determine portal type and handle accordingly
    const url = new URL(jobUrl);
    
    if (url.hostname.includes('linkedin')) {
      detectedPortal = 'linkedin';
      await portalHandlers.handleLinkedIn(page, jobUrl, missingFields);
    } else if (url.hostname.includes('indeed')) {
      detectedPortal = 'indeed';
      await portalHandlers.handleIndeed(page, jobUrl, missingFields);
    } else {
      detectedPortal = 'generic';
      await portalHandlers.handleGenericPortal(page, jobUrl, missingFields);
    }
    
    // Wait for confirmation
    await page.waitForTimeout(3000);
    
    // Check for success
    const successSelectors = [
      'text=application submitted',
      'text=thank you for applying',
      'text=application complete',
      'text=success'
    ];
    
    for (const selector of successSelectors) {
      const successElement = await page.$(selector);
      if (successElement) {
        console.log('🎉 Application successful!');
        break;
      }
    }

    return {
      status: 'success',
      missing_fields: missingFields.length ? missingFields : null,
      portal: detectedPortal
    };
    
  } catch (error) {
    console.error('❌ Error during automation:', error.message);
    return {
      status: 'error',
      error: error.message,
      missing_fields: missingFields.length ? missingFields : null,
      portal: detectedPortal
    };
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

// CLI interface
if (require.main === module) {
  const jobUrl = process.argv[2];
  if (!jobUrl) {
    console.log('Usage: node server.js <job-url>');
    console.log('Example: node server.js https://www.linkedin.com/jobs/view/1234567890/');
    process.exit(1);
  }
  
  automateJobApplication(jobUrl).catch(console.error);
}

module.exports = { automateJobApplication, portalHandlers, selectResume };
