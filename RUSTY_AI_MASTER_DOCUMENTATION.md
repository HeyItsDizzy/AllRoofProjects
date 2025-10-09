# 🤖 RUSTY AI MASTER DOCUMENTATION - Single Source of Truth

> **Comprehensive documentation for the complete Rusty AI workflow automation system**

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Current Architecture](#current-architecture)
3. [Core Features](#core-features)
4. [Workflow Procedures](#workflow-procedures)
5. [AI Capabilities](#ai-capabilities)
6. [Configuration Management](#configuration-management)
7. [Integration Points](#integration-points)
8. [Deployment & Operations](#deployment--operations)
9. [Future Enhancement Roadmap](#future-enhancement-roadmap)

---

## 🎯 System Overview

### **Primary Purpose**
Rusty AI is an intelligent automation system that transforms email-based project requests into fully structured projects in your web application with minimal human intervention.

### **Core Workflow**
```
📧 Email Arrives → 🤖 AI Analysis → 📊 Data Extraction → 🗂️ Project Creation → 📁 File Organization → 🎯 Workload Management
```

### **Key Business Value**
- **95% automation** of project creation from emails
- **Intelligent workload balancing** with capacity management
- **Automatic plan downloads** from 6+ major platforms
- **Smart client identification** with database integration
- **Human-in-the-loop** for quality assurance
- **Construction-specific knowledge** for accurate data extraction

---

## 🏗️ Current Architecture

### **System Components**

#### **1. Email Processing Engine** (`/root/rusty_ai/imap/`)
- **Main Processor**: `index_advanced.js` (AI-powered) + `index.js` (legacy)
- **AI Engine**: `SmartAI.js` - Multi-provider AI with construction knowledge
- **Human Feedback**: `RustyHumanFeedback.js` - Smart escalation system
- **Plan Downloads**: `PlanLinkDownloader.js` - Web scraping automation

#### **2. Agent Rusty** (`/root/rusty_ai/agent-rusty/`)
- **AI Agent**: `AIAgent.js` - Conversational AI assistant
- **Email Processor**: `EmailProcessor.js` - Email handling
- **Knowledge Base**: `KnowledgeBase.js` - Dynamic construction knowledge
- **Response Manager**: `SmartResponseManager.js` - Email sending with safety controls

#### **3. Backend Integration** (`ProjectManagerApp/Backend/`)
- **API Routes**: Project creation, file management, client database
- **File Storage**: Automated folder structure creation
- **Database**: Project tracking and client information

### **Directory Structure**
```
🤖 Rusty AI System/
├── imap/                           # Email Processing Engine
│   ├── index_advanced.js           # Main AI processor
│   ├── SmartAI.js                  # AI analysis engine
│   ├── RustyHumanFeedback.js       # Human oversight
│   ├── PlanLinkDownloader.js       # Plan downloads
│   ├── ClientMatcher.js            # Client identification
│   ├── features/
│   │   ├── workload-management/    # Capacity planning
│   │   ├── headstart-priorities/   # Early completion
│   │   └── configuration/          # Settings management
│   └── .markdown/                  # Documentation archive
│
├── agent-rusty/                    # Conversational AI Agent
│   ├── AIAgent.js                  # Main AI agent
│   ├── KnowledgeBase.js           # Dynamic knowledge system
│   ├── SmartResponseManager.js    # Email responses
│   └── Roofing and Cladding RAG/  # Knowledge database
│
└── ProjectManagerApp/              # Web Application
    ├── Backend/                    # API server
    └── Frontend/                   # Web interface
```

---

## 🚀 Core Features

### **1. Intelligent Email Processing**
- **Multi-AI Support**: OpenAI GPT-4, Anthropic Claude, Groq, Local Ollama
- **Spam Detection**: 90%+ accuracy with confidence scoring
- **Business Logic**: Understands construction industry patterns
- **Context Analysis**: Evaluates email content, attachments, and links

### **2. Advanced Plan Downloads**
- **Supported Platforms**: Google Drive, Dropbox, SharePoint, WeTransfer, MEGA, Box
- **Web Scraping**: Puppeteer-based browser automation
- **Failure Handling**: Automatic human escalation for failed downloads
- **File Organization**: Automatic project folder creation

### **3. Construction Knowledge Integration**
- **Dynamic Knowledge Base**: Loads from JSON files (DRY principle)
- **Australian Standards**: AS 1562.1-2018 compliance
- **Material Specifications**: BMT, profiles, fixing requirements
- **Pitch Logic**: Accurate roofing profile recommendations
- **Estimating Defaults**: Automatic scope generation

### **4. Client Identification System**
- **Database Matching**: Exact and fuzzy client database comparisons
- **Signature Analysis**: Extracts company names from email signatures
- **Domain Intelligence**: Business domain analysis (excludes gmail, etc.)
- **Confidence Scoring**: Returns confidence levels for manual review

### **5. Workload Management**
- **Capacity Planning**: Intelligent distribution across business days
- **Project Complexity**: Different units for residential vs commercial
- **Due Date Optimization**: Finds next available capacity slot
- **Lead Time Buffer**: Configurable extra business days

### **6. Headstart Priority System**
- **Early Completion Detection**: Identifies projects that can be started early
- **Priority Scoring**: Delayed projects get higher priority
- **Opportunity Reports**: Daily planning for optimal resource utilization
- **Skills Matching**: Matches projects to estimator capabilities

### **7. Human Oversight System**
- **Smart Escalation**: Low confidence decisions go to human review
- **Detailed Context**: Full email analysis for human decisions
- **Learning Feedback**: Improves accuracy based on human corrections
- **Safety Controls**: Testing mode for production safety

---

## 🔄 Workflow Procedures

### **A. Incoming Email Workflow**
```
1. 📧 Email arrives in IMAP inbox (rusty_ai@allrooftakeoffs.com)
2. 🤖 AI analyzes email content for spam detection (>90% accuracy)
3. 🔍 AI extracts project information:
   - Project address(es)
   - Client company identification
   - Project requirements and scope
   - Plan links and attachments
4. 🕷️ Automatic plan downloads via web scraping
5. 📊 Workload analysis and due date calculation
6. 🗂️ Single Project or multple Projects(based on email content) creation in backend with folder structure
7. ✅ Confirmation or 🚨 human escalation if uncertain
```

### **B. Client Project Creation Workflow**
```
PHASE 1:
1. 🎯 Client Identification Process:
   - Check against existing client database
   - Analyze email signature for company name
   - Extract from business domain if needed
   - Assign confidence score
   - (Note: do not Spam filter away potential new clients)

2. 📋 Project Data Extraction:
   - Property address(es) - handle multiple locations
   - Contact information (name, email, phone)
   - Project name, scope and requirements
   - Special instructions or deadlines
   - Plan links and attachment references

3. 🏗️ Construction Analysis:
   - Determine project type (residential/commercial)
   - Estimate complexity units for workload management, (for each building withing project)
   - Apply Estimating Defaults for Finishes Schedule where not mentioned in plans
   - Identify material specifications if available, or Use Estimating Defaults

End of Phase 1 Summary: (also note if Item is listed in scope and the sourced, or if assumed based on estimating defaults)      
    ie;
           Name: Library Extension Brisabne City,
           Address: 266 George St, Brisbane City QLD 4000, Australia
           Scope / Requirment : as anylised with 'Special instructions', 'deadlines', 'Plan links', and attachment references'
           Project type: Commercial Roof and Walls
           Estimating Units Required: 4 Units
           Finishes Schedule:
                Roof Cover/s:	Kliplok 700 0.48, Colorbond 
                                Corrugated 0.48, Colorbond
                Roof Qty:	    631.96 m2 
                Insulation:	    Insulation, Polyair Performa 7.0 (40m2 Roll)
                Safety Mesh:    CSR,Safety Mesh (90m2/pk) - 617.59 m2 
                Rafter Spacing:	600 mm Ctrs	
                Gutters:    	Custom Fold Gutter 1000G 6B,Colorbond
                Fascia:     	Fascia Flashing 900g 4b (LM),Colorbond
                Downpipes:      4	x   100mm Round Downpipe,Colorbond
            Fall Protection:    YES - Roof Rail - 98.98 Lm
     
Phase 2:
4. 📁 File Structure Creation:
   - For each Project found withni the email (may be multple) Create project folderfor each as;
         "YY-MMXXX - Project name"
   - Establish Admin/, Plans/, and supporting folders
   - Download and organize plan files
   - Generate initial project documentation

5. 🎯 Workload Integration:
   - Calculate estimation units required
   - Check daily capacity availability
   - Find optimal due date slot
   - Apply lead time buffer (this shall be calulated automatically, if the natural due date is Full, we must consider this a +1 Day 'Extended' lead time, it shall be dynamic based on current oustanding workload)
   - Update workload tracking (including sending Job delayed emails if an already logged job is overdue, overdue projects have top priority for the next project to begin and queued as such if multple)
```

### **C. Quality Assurance Workflow**
```
1. 🤖 AI Confidence Assessment:
   - Spam detection confidence > 90%
   - Client identification confidence score (be sure not to spam filter away potential new clients)
   - Project data extraction completeness
   - Plan download success rate

2. 🚨 Human Escalation Triggers:
   - Low AI confidence scores
   - Unusual email patterns
   - Failed plan downloads
   - Conflicting or unclear project information

3. 👤 Human Review Process:
   - Receive detailed analysis email
   - Review AI decisions and extracted data
   - Approve, modify, or reject project creation
   - Provide feedback for AI learning

4. ✅ Final Project Creation:
   - Backend API project creation
   - File organization and downloads
   - Workload schedule updates
   - Client and internal notifications
```

### **D. Capacity Management Workflow**
```
1. 📊 Daily Capacity Configuration:
   - Set units per day (Monday-Sunday)
   - Configure lead time buffers
   - Adjust for busy/slow periods

2. 🎯 Project Scheduling:
   - Calculate required estimation units
   - Find next available capacity slot
   - Apply business day calculations
   - Optimize due date placement

3. 🚀 Headstart Opportunities:
   - Identify delayed projects
   - Find early completion opportunities
   - Match to estimator skills
   - Generate daily planning reports
```

---

## 🧠 AI Capabilities

### **Construction Knowledge Base**
The AI system understands:

#### **Building Components**
- **Roof Profiles**: Corrugated, Trimdek, KlipLok, Custom Orb
- **Wall Cladding**: Longspan, Weatherboard, Brick veneer
- **Insulation**: R-values, Anticon, bulk insulation types
- **Fixing Systems**: Pierced-fix, concealed-fix, screw specifications

#### **Technical Specifications**
- **BMT Standards**: 0.42 residential, 0.48+ commercial
- **Pitch Requirements**: Profile-specific minimum pitch rules
- **Wind Ratings**: N1, N2, N3 classifications
- **Coastal Considerations**: Distance-based material upgrades

#### **Project Analysis**
- **Address Extraction**: Handles multiple locations intelligently
- **Scope Generation**: Creates detailed construction breakdowns
- **Material Identification**: Recognizes specific products and brands
- **Compliance Checking**: Australian Standards integration

### **AI Provider Configuration**
```bash
# OpenAI (Recommended)
RUSTY_AI_KEY=sk-proj-your_openai_key_here

# Anthropic Claude (Best for business logic)
RUSTY_AI_KEY=sk-ant-your_anthropic_key_here

# Groq (Free & Fast)
RUSTY_AI_KEY=gsk_your_groq_key_here

# Local Ollama (Offline)
# No key needed, runs locally
```

---

## ⚙️ Configuration Management

### **Environment Variables** (`.env`)
```bash
# Email Configuration
EMAIL_USER=rusty_ai@allrooftakeoffs.com
EMAIL_PASS=Roofquotes4all!
# IMAP Configuration (for Recieving responses)
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
# SMTP Configuration (for sending responses)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465

# Backend Integration
BACKEND_URL=http://localhost:3000
BACKEND_API_KEY=rusty_api_key_2025_secure_automation_v1

# AI Configuration
RUSTY_AI_KEY=your_ai_provider_key

# Human Feedback
ADMIN_EMAIL=requests@allrooftakeoffs.com.au

# Safety Controls
RUSTY_TESTING_MODE=true  # Redirects emails during testing
```

### **Capacity Management Configuration**
```bash
# Daily capacity settings
node features/configuration/set_daily_capacity.js Monday 15
node features/configuration/set_daily_capacity.js Friday 8

# Lead time buffer
node features/configuration/set_lead_time.js 2
```

### **Dynamic Knowledge Configuration**
- **Location**: `agent-rusty/Roofing and Cladding RAG/practices/estimating-defaults.json`
- **Purpose**: Single source of truth for construction rules
- **Updates**: Automatically loaded by KnowledgeBase.js (no code changes needed)

---

## 🔗 Integration Points

### **Backend API Endpoints**
- `POST /api/projects` - Create new project
- `GET /api/clients` - Client database lookup
- `POST /api/upload` - File upload handling
- `GET /api/workload` - Workload tracking

### **File Storage Integration**
- **Local**: VPS file system with organized folder structure
- **Remote**: Integration with .FM drive system
- **Backup**: Project files stored in multiple locations

### **Email System Integration**
- **IMAP**: Incoming email monitoring
- **SMTP**: Human feedback and notifications
- **Reply System**: Agent Rusty conversational responses

---

## 🚀 Deployment & Operations

### **Production Setup**
```bash
# VPS deployment (/root/rusty_ai/)
pm2 start ecosystem.config.js

# Monitor services
pm2 list
pm2 logs rusty-ai
pm2 monit

# System status
pm2 restart rusty-ai
pm2 save
pm2 startup
```

### **Service Components**
- **rusty-ai**: Email processing engine (index_advanced.js)
- **agent-rusty**: Conversational AI agent (index.js)
- **API server**: Optional headstart priority API

### **Monitoring & Maintenance**
- **Log Files**: `/root/rusty_ai/imap/logs/` and `/root/rusty_ai/agent-rusty/logs/`
- **Health Checks**: PM2 automatic restart on failure
- **Performance**: Resource monitoring via PM2 monit
- **Updates**: Git pull and PM2 restart workflow

---

## 🎯 Future Enhancement Roadmap

### **Phase 1: Core Workflow Automation** ✅
- [x] AI-powered email processing
- [x] Automatic project creation
- [x] Plan downloads
- [x] Workload management
- [x] Human oversight system

### **Phase 2: Enhanced Intelligence** ✅
- [x] Dynamic knowledge base
- [x] Client identification system
- [x] Construction-specific AI
- [x] Safety controls and testing mode

### **Phase 3: Advanced Workflows** (Proposed)
- [ ] Multi-step project workflows
- [ ] Client communication automation
- [ ] Progress tracking integration
- [ ] Invoice generation automation
- [ ] Quality control checkpoints

### **Phase 4: Business Intelligence** (Future)
- [ ] Predictive workload modeling
- [ ] Client behavior analysis
- [ ] Profitability optimization
- [ ] Market trend analysis
- [ ] Resource allocation optimization

---

## 📊 Performance Metrics

### **Current System Performance**
- **Email Processing**: ~30 seconds per email (including downloads)
- **Spam Detection**: 90%+ accuracy with confidence scoring
- **Project Creation**: 95%+ success rate
- **Human Escalation**: <10% of emails need review
- **Plan Downloads**: 85%+ success across supported platforms

### **Business Impact**
- **Time Savings**: 95% reduction in manual email processing
- **Accuracy**: Higher project accuracy with AI analysis
- **Capacity**: Intelligent workload balancing
- **Quality**: Human oversight for edge cases
- **Scalability**: Handles growing email volume automatically

---

## 🎉 Quick Start Commands

```bash
# Start complete system
pm2 start ecosystem.config.js

# Monitor system
pm2 list && pm2 logs --lines 20

# Test AI capabilities
node -e "const KB = require('./agent-rusty/KnowledgeBase'); const kb = new KB(); console.log(kb.getRoofingRecommendations('residential', 4));"

# Check workload
node -e "const WM = require('./imap/features/workload-management/WorkloadManager'); const wm = new WM(); console.log(JSON.stringify(wm.getWorkloadSummary(7), null, 2));"

# Configure capacity
node imap/features/configuration/set_daily_capacity.js Wednesday 15

# View headstart opportunities
node -e "const HP = require('./imap/features/headstart-priorities/HeadstartPriorityManager'); const hp = new HP(); hp.generateHeadstartReport(2);"
```

---

*This document represents the complete, unified documentation for the Rusty AI system as of September 2025. All conflicting information from previous documents has been resolved into this single source of truth.*