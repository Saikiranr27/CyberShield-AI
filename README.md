CyberShield AI
AI-Powered Cybersecurity Assessment & Reconnaissance Platform

A web-based cybersecurity assessment platform designed to perform authorized reconnaissance and security analysis against target systems. CyberShield AI combines network scanning, vulnerability assessment, SSL/TLS analysis, DNS and WHOIS reconnaissance, technology detection, risk scoring, findings, and automated PDF reporting in one dashboard.

📌 Project Overview

CyberShield AI is a cybersecurity-focused web application developed to simplify the process of performing security assessments.

Instead of using multiple command-line tools separately, the platform provides a single web interface where users can enter an authorized target and perform multiple security analysis operations.

The application collects technical information about the target, analyzes the results, identifies security findings, calculates an overall risk score, stores scan history, and generates a downloadable PDF security report.

The project was developed as a hands-on implementation of cybersecurity, backend development, frontend development, Linux administration, cloud deployment, and security automation concepts.

🔍 Key Features
Port & Service Scanner

Uses Nmap to identify open ports, running services, and available service information on the target.

Vulnerability Assessment

Analyzes discovered services and identifies potential security weaknesses using the application's vulnerability assessment logic.

SSL/TLS Analyzer

Analyzes HTTPS endpoints and provides information about certificates, TLS configuration, validity, and security-related conditions.

DNS Reconnaissance

Retrieves DNS-related information for the target domain.

WHOIS Lookup

Collects available WHOIS registration information for supported domains.

Technology Fingerprinting

Identifies technologies and services associated with the target web application.

Security Findings

Combines scan results into structured security findings that can be reviewed from the dashboard.

Risk Scoring

Calculates an overall security risk score based on the discovered findings.

Scan History

Stores completed scan information in the SQLite database so previous assessments can be reviewed.

PDF Security Reports

Generates downloadable security assessment reports containing scan results, findings, risk information, and technical details.

Responsive Dashboard

Provides a responsive interface designed for both desktop and mobile devices.

🏗️ System Architecture

                    User
                     |
                     v
            React / Vite Frontend
                     |
                     v
                  Netlify
                     |
                  HTTPS/API
                     |
                     v
             AWS EC2 Ubuntu Server
                     |
                     v
                   Nginx
                     |
                     v
                 Gunicorn
                     |
                     v
              Flask Backend API
                     |
        +------------+-------------+
        |            |             |
        v            v             v
      Nmap      Security Modules  SQLite
        |            |
        |            +-------------------+
        |                                |
        v                                v
 Port / Service                    Findings / Risk
   Analysis                           Analysis
                                         |
                                         v
                                  PDF Report Generation



🧩Application Workflow:

1. User enters an authorized target
                ↓
2. CyberShield AI validates the request
                ↓
3. Reconnaissance and security scans are performed
                ↓
4. Results are collected and analyzed
                ↓
5. Security findings are generated
                ↓
6. Overall risk score is calculated
                ↓
7. Results are displayed on the dashboard
                ↓
8. Scan results are stored in SQLite
                ↓
9. Security report can be generated as PDF

🖥️ Main Modules

Dashboard
├── Scan Overview
├── Risk Score
├── Backend Status
└── Scan Results

Ports
└── Open ports and detected services

Vulnerabilities
└── Security weaknesses and severity information

DNS
└── DNS reconnaissance results

SSL
└── SSL/TLS certificate and security analysis

WHOIS
└── Domain registration information

Technologies
└── Detected web technologies and services

Findings
└── Consolidated security findings

Reports
└── PDF report generation and report history

Settings
└── Application settings

🛠️ Technology Stack

| Component          | Technology     |
| ------------------ | -------------- |
| Frontend           | React + Vite   |
| Backend            | Python + Flask |
| Application Server | Gunicorn       |
| Web Server         | Nginx          |
| Database           | SQLite         |
| Network Scanner    | Nmap           |
| Frontend Hosting   | Netlify        |
| Backend Hosting    | AWS EC2        |
| Version Control    | Git + GitHub   |


🔐 Security Approach

CyberShield AI is designed for authorized security assessment and defensive security analysis.

The platform should only be used against:

systems you own
systems you are responsible for
systems where you have explicit authorization to perform security testing

The project is intended for cybersecurity learning, assessment, testing, and authorized security research.

📊 Results & Reporting

After a scan, CyberShield AI presents the collected results through the dashboard and organizes them into categories such as:

Open ports
Services
Vulnerabilities
SSL/TLS information
DNS information
WHOIS information
Technologies
Security findings
Risk score

The results can also be converted into a structured PDF security report for documentation and review.

☁️ Deployment

The current deployment uses:

Frontend → Netlify
Backend  → AWS EC2
Proxy    → Nginx
Server   → Gunicorn
Database → SQLite

This separation allows the frontend and backend to be hosted independently while communicating through the application's API.

💻 Local Development
Clone the repository
git clone https://github.com/Saikiranr27/CyberShield-AI.git
cd CyberShield-AI
Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
Frontend

Open another terminal:

cd frontend
npm install
npm run dev

Then open the Vite URL shown in the terminal.

📁 Project Structure
CyberShield-AI/
│
├── backend/
│   ├── api/
│   ├── database/
│   ├── modules/
│   ├── reports/
│   ├── config.py
│   ├── app.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── PROJECT_DOCUMENTATION.md

Adjust this tree to match your actual folders if yours differs.

🎯 Project Objectives

The main objectives of CyberShield AI are:

Combine multiple cybersecurity assessment capabilities into one platform.
Simplify reconnaissance and security analysis workflows.
Present technical security information through an easy-to-use dashboard.
Provide centralized findings and risk scoring.
Generate professional security reports.
Gain practical experience with cybersecurity tools, web development, Linux, cloud infrastructure, and deployment.
📚 Learning Outcomes

This project provided practical experience with:

Cybersecurity reconnaissance
Network scanning
Vulnerability assessment
SSL/TLS analysis
DNS and WHOIS reconnaissance
Security reporting
Python and Flask API development
React frontend development
SQLite database usage
Linux server administration
Nginx and Gunicorn
AWS EC2 deployment
Netlify deployment
Git and GitHub
Debugging and production troubleshooting
🔮 Future Improvements

Possible future improvements include:

User authentication and authorization
More advanced vulnerability intelligence
Improved security report templates
Centralized logging and monitoring
More detailed scan analytics
Role-based access control
Scalable production database support
Containerized deployment
⚠️ Responsible Use

CyberShield AI is intended strictly for authorized security testing and educational use.

Do not use this platform to scan, test, attack, or access systems without explicit permission from the owner.

The developer is not responsible for misuse of the software.


                                  




