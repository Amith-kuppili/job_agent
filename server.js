const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const authStatePath = path.resolve(process.cwd(), 'auth.json');

app.use(express.json());

// --- YOUR PERSONAL DATA ---
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
  ]
};

// --- UTILITIES ---

/**
 * SMART FILL SYSTEM
 * Mimics human behavior to prevent "Missing Fields" errors.
 * Clears field and types with a delay to trigger site event listeners.
 */
async function smartFill(context, selectors, value, fieldName, missingFields) {
  for (const selector of selectors) {
    try {
      const field = await context.$(selector);
      if (field) {
        await field.fill(''); // Clear existing text
        await field.type(value, { delay: 30 }); // Simulate human typing
        console.log(`✅ Filled ${fieldName} using ${selector}`);
        return true;
      }
    } catch (err) {}
  }
  if (!missingFields.includes(fieldName)) {
    missingFields.push(fieldName);
  }
  console.log(`⚠️ Missing field: ${fieldName}`);
  return false;
}

async function removeOverlays(page) {
  console.log("🧹 Cleaning page overlays...");
  const overlaySelectors = [
    'button:has-text("Accept")', 'button:has-text("Agree")', 
    'button:has-text("Allow all")', '.cookie-banner', 
    '#cookie-banner', 'button[aria-label="Close"]', '.modal-close'
  ];
  for (const selector of overlaySelectors) {
    try {
      const btn = await page.$(selector);
      if (btn) await btn.click({ force: true });
    } catch (e) {}
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
  return path.resolve(process.cwd(), resumeFile);
}

// --- PORTAL HANDLERS ---

const portalHandlers = {
  
  /**
   * CORE FILLING ENGINE
   * Accepts 'context' which can be a Page or an IFrame.
   */
  async fillPersonalInfo(context, missingFields) {
    console.log('👤 Filling Personal Info...');
    const user = data.personal;

    await smartFill(context, ['input[name*="first"]', 'input[id*="first"]', 'input[placeholder*="First"]', 'input[autocomplete="given-name"]'], user.firstName, 'firstName', missingFields);
    await smartFill(context, ['input[name*="last"]', 'input[id*="last"]', 'input[placeholder*="Last"]', 'input[autocomplete="family-name"]'], user.lastName, 'lastName', missingFields);
    await smartFill(context, ['input[type="tel"]', 'input[name*="phone"]', 'input[id*="phone"]', 'input[placeholder*="Phone"]'], user.phone, 'phone', missingFields);
    await smartFill(context, ['input[type="email"]', 'input[name*="email"]', 'input[id*="email"]', 'input[placeholder*="Email"]'], user.email, 'email', missingFields);
    await smartFill(context, ['input[name*="city"]', 'input[id*="city"]', 'input[placeholder*="city"]'], user.city, 'city', missingFields);
    await smartFill(context, ['input[name*="state"]', 'input[id*="state"]', 'input[placeholder*="state"]'], user.state, 'state', missingFields);
    await smartFill(context, ['input[name*="zip"]', 'input[id*="zip"]', 'input[name*="postal"]', 'input[placeholder*="zip"]'], user.zip, 'zip', missingFields);
    await smartFill(context, ['input[name*="country"]', 'input[id*="country"]', 'input[placeholder*="country"]'], user.country, 'country', missingFields);
    await smartFill(context, ['input[name*="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="linkedin"]'], user.linkedin, 'linkedin', missingFields);
    await smartFill(context, ['input[name*="github"]', 'input[id*="github"]', 'input[placeholder*="github"]'], user.github, 'github', missingFields);
  },

  async handleLinkedIn(page, jobUrl, missingFields) {
    console.log('🚀 Processing LinkedIn...');
    const loginBtn = await page.$('text=Sign in');
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForSelector('input[name="session_key"]', { timeout: 5000 });
      await smartFill(page, ['input[name="session_key"]'], data.personal.email, 'email', missingFields);
      await smartFill(page, ['input[name="session_password"]'], process.env.LINKEDIN_PASSWORD, 'password', missingFields);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
    }

    const easyApplyBtn = await page.$('text=Easy Apply');
    if (easyApplyBtn) {
      await easyApplyBtn.click();
      await page.waitForSelector('.jobs-easy-apply-modal', { timeout: 8000 });
      let step = 1;
      while (step <= 10) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          const resumePath = await selectResume(page, await page.title());
          await page.setInputFiles('input[type="file"]', resumePath);
        }
        await this.fillPersonalInfo(page, missingFields);
        const submitBtn = await page.$('button:has-text("Submit")');
        const nextBtn = await page.$('button:has-text("Next")');
        if (submitBtn) { await submitBtn.click(); break; }
        else if (nextBtn) { await nextBtn.click(); }
        else { break; }
        await page.waitForTimeout(2000);
        step++;
      }
    }
  },

  async handleGenericPortal(page, jobUrl, missingFields) {
    console.log("🌐 Processing Generic Portal...");
    await removeOverlays(page);
    
    const applySelectors = [
      'text=Apply', 'text=Apply Now', 'text=Easy Apply', 'button:has-text("Apply")', '[id*="apply"]'
    ];

    let clicked = false;
    for (const sel of applySelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click({ force: true });
          clicked = true;
          console.log(`✅ Clicked apply: ${sel}`);
          break;
        }
      } catch (err) {}
    }

    if (clicked) {
      console.log("⏳ Waiting for form fields to load...");
      try {
        await page.waitForSelector('input, textarea, select', { timeout: 10000 });
        await page.waitForTimeout(2000); 
      } catch (e) {
        console.log("⚠️ No inputs found on main page, checking iframes...");
      }
    }

    // 1. CHECK IFRAMES FIRST (Crucial for Workday/Taleo)
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const hasInput = await frame.$('input, textarea, select');
        if (hasInput) {
          console.log("✅ Found application form inside an iframe. Switching context...");
          await this.fillPersonalInfo(frame, missingFields); 
          const frameSubmit = await frame.$('button[type="submit"], input[type="submit"]');
          if (frameSubmit) await frameSubmit.click();
          return; // Form handled in iframe
        }
      } catch (err) {}
    }

    // 2. FALLBACK TO MAIN PAGE
    const form = await page.$('form, input, textarea, select');
    if (form) {
      console.log("✅ Form found on main page.");
      await this.fillPersonalInfo(page, missingFields);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        const resumePath = await selectResume(page, await page.title());
        await page.setInputFiles('input[type="file"]', resumePath);
      }
      const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) await submitBtn.click();
    } else if (!clicked) {
      throw new Error("No apply button or form detected");
    }
  }
};

// --- CORE AUTOMATION ---

async function automateJobApplication(jobUrl) {
  const missingFields = [];
  let detectedPortal = 'generic';

  const browser = await chromium.launch({ 
    headless: true, // REQUIRED for Render/Cloud servers
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  const context = await browser.newContext({ 
    viewport: { width: 1280, height: 720 },
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto(jobUrl, { waitUntil: 'networkidle' });
    const url = new URL(jobUrl);
    
    if (url.hostname.includes('linkedin')) {
      detectedPortal = 'linkedin';
      await portalHandlers.handleLinkedIn(page, jobUrl, missingFields);
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
