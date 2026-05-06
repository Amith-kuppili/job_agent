const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const authStatePath = path.resolve(process.cwd(), 'auth.json');

app.use(express.json());

// --- PERSONAL DATA ---
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

// --- UTILITIES ---

async function removeOverlays(page) {
  console.log("🧹 Removing overlays/cookie banners...");
  const overlaySelectors = [
    'button:has-text("Accept")', 
    'button:has-text("Agree")', 
    'button:has-text("Allow all")', 
    '.cookie-banner', 
    '#cookie-banner', 
    'button[aria-label="Close"]', 
    '.modal-close'
  ];
  for (const selector of overlaySelectors) {
    try {
      const btn = await page.$(selector);
      if (btn) await btn.click({ force: true });
    } catch (e) {}
  }
}

async function safeFill(page, selector, value) {
  try {
    const el = await page.$(selector);
    if (el) {
      await el.fill(value);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`⚠️  Fill failed on ${selector}:`, error.message);
    return false;
  }
}

async function selectResume(page, jobTitle = '') {
  const title = jobTitle.toLowerCase();
  let resumeFile = 'Amith_resume.pdf'; 

  if (/sas|power[- ]?bi|analytics|bi|data science|ml|ai/.test(title)) {
    resumeFile = 'RESUME AMITH.pdf';
  } else if (/automation|n8n|docker|devops/.test(title)) {
    resumeFile = 'Automation_resume.pdf';
  } else if (/business intelligence|bi|power bi/.test(title)) {
    resumeFile = 'Automation_BI_resume.pdf';
  }

  const resumePath = path.resolve(process.cwd(), resumeFile);
  if (!fs.existsSync(resumePath)) {
    console.warn(`⚠️  Resume file not found: ${resumePath}`);
    return path.resolve(process.cwd(), 'Amith_resume.pdf');
  }
  return resumePath;
}

// --- PORTAL HANDLERS ---

const portalHandlers = {
  async handleLinkedIn(page, jobUrl, missingFields) {
    console.log('🚀 Processing LinkedIn job...');
    const loginBtn = await page.$('text=Sign in');
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForSelector('input[name="session_key"]', { timeout: 5000 });
      await safeFill(page, 'input[name="session_key"]', data.personal.email);
      await safeFill(page, 'input[name="session_password"]', process.env.LINKEDIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
    }

    const easyApplyBtn = await page.$('text=Easy Apply');
    if (easyApplyBtn) {
      await easyApplyBtn.click();
      await page.waitForSelector('.jobs-easy-apply-modal', { timeout: 8000 });
      
      let currentStep = 1;
      while (currentStep <= 10) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          const resumePath = await selectResume(page, await page.title());
          await page.setInputFiles('input[type="file"]', resumePath);
        }
        await this.fillPersonalInfo(page, missingFields);
        
        const submitBtn = await page.$('button:has-text("Submit")');
        const reviewBtn = await page.$('button:has-text("Review")');
        const nextBtn = await page.$('button:has-text("Next")');
        
        if (submitBtn) { await submitBtn.click(); break; }
        else if (reviewBtn) { await reviewBtn.click(); }
        else if (nextBtn) { await nextBtn.click(); }
        else { break; }
        
        await page.waitForTimeout(2000);
        currentStep++;
      }
    }
  },

  async handleIndeed(page, jobUrl, missingFields) {
    console.log('🚀 Processing Indeed job...');
    const applyBtn = await page.$('text=Apply now');
    if (applyBtn) {
      await applyBtn.click();
      await page.waitForSelector('form', { timeout: 8000 });
      await this.fillPersonalInfo(page, missingFields);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const resumePath = await selectResume(page, await page.title());
        await page.setInputFiles('input[type="file"]', resumePath);
      }
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
    }
  },

  // INTEGRATED IMPROVED GENERIC HANDLER
  async handleGenericPortal(page, jobUrl, missingFields) {
    console.log("🌐 Processing Generic Portal...");
    await removeOverlays(page);
    await page.waitForTimeout(3000);

    const applySelectors = [
      'text=Apply', 'text=Apply Now', 'text=Easy Apply', 'text=Submit Application',
      'button:has-text("Apply")', 'button:has-text("Apply Now")', 'a:has-text("Apply")',
      '[aria-label*="Apply"]', '[class*="apply"]', '[id*="apply"]'
    ];

    let clicked = false;
    for (const sel of applySelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          console.log(`✅ Found apply button: ${sel}`);
          await removeOverlays(page);
          try {
            await btn.click({ force: true });
          } catch {
            await page.evaluate((selector) => {
              const el = document.querySelector(selector);
              if (el) el.click();
            }, sel);
          }
          clicked = true;
          await page.waitForTimeout(4000);
          break;
        }
      } catch (err) {}
    }

    // Iframe detection
    const frames = page.frames();
    for (const frame of frames) {
      try {
        if (await frame.$('form, input, textarea, select')) {
          console.log("✅ Found form inside iframe");
          // Note: Fill logic needs to be applied to the frame specifically if found
          await this.fillPersonalInfo(frame, missingFields); 
          return;
        }
      } catch {}
    }

    // Normal form detection
    const form = await page.$('form, input, textarea, select');
    if (form) {
      console.log("✅ Application form detected");
      await this.fillPersonalInfo(page, missingFields);
      await this.fillExperience(page, missingFields);
      await this.fillEducation(page, missingFields);
      
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const resumePath = await selectResume(page, await page.title());
        await page.setInputFiles('input[type="file"]', resumePath);
      }

      const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) await submitBtn.click();
    } else if (!clicked) {
      throw new Error("No apply button or form found on page");
    } else {
      throw new Error("Apply clicked but no application form detected");
    }
  },

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
      let filled = false;
      for (const alias of aliases) {
        const selectors = [
          `input[placeholder*="${alias}" i]`, `input[name*="${alias}" i]`, `input[id*="${alias}" i]`,
          `textarea[placeholder*="${alias}" i]`, `textarea[name*="${alias}" i]`, `textarea[id*="${alias}" i]`
        ];
        for (const selector of selectors) {
          if (await safeFill(page, selector, data.personal[field])) {
            filled = true;
            break;
          }
        }
        if (filled) break;
      }
      if (!filled) missingFields.push(field);
    }
  },

  async fillExperience(page, missingFields) {
    const expSections = await page.$$('section, div:has-text("experience")');
    for (const section of expSections) {
      const addBtn = await section.$('button:has-text("Add"), button:has-text("+")');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        const exp = data.experience[0];
        await safeFill(page, 'input[name*="title" i]', exp.title);
        await safeFill(page, 'input[name*="company" i]', exp.company);
        await safeFill(page, 'textarea[name*="description" i]', exp.description);
      }
    }
  },

  async fillEducation(page, missingFields) {
    const eduSections = await page.$$('section, div:has-text("education")');
    for (const section of eduSections) {
      const addBtn = await section.$('button:has-text("Add"), button:has-text("+")');
      if (addBtn) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        const edu = data.education[0];
        await safeFill(page, 'input[name*="degree" i]', edu.degree);
        await safeFill(page, 'input[name*="institution" i]', edu.institution);
      }
    }
  }
};

// --- MAIN AUTOMATION ---

async function automateJobApplication(jobUrl) {
  const missingFields = [];
  let detectedPortal = 'generic';

  const browser = await chromium.launch({ 
    headless: true, // REQUIRED FOR RENDER/SITES
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    slowMo: 50 
  });

  const contextOptions = { viewport: { width: 1280, height: 720 } };
  if (fs.existsSync(authStatePath)) contextOptions.storageState = authStatePath;

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  
  try {
    await page.goto(jobUrl, { waitUntil: 'networkidle' });
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

    return { status: 'success', missing_fields: missingFields.length ? missingFields : null, portal: detectedPortal };
  } catch (error) {
    return { status: 'error', error: error.message, missing_fields: missingFields, portal: detectedPortal };
  } finally {
    await browser.close();
  }
}

// --- API SERVER ---

app.post("/run", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const result = await Promise.race([
      automateJobApplication(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 60s")), 60000))
    ]);

    return res.json({ status: "completed", result });
  } catch (err) {
    return res.status(500).json({ status: "error", error: err.message });
  }
});

app.get('/', (req, res) => res.json({ status: "ok", service: "job-automation-api" }));

app.listen(3000, () => console.log("Server running on port 3000"));
