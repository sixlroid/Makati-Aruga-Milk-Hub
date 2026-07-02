# Makati Aruga Milk Hub (MAMH)

**A Web-Based Human Milk Bank Management System**

## Project Overview
The MHMB Portal is a secure, end-to-end web application designed to digitize and streamline the entire lifecycle of human milk banking. It eliminates the human errors associated with traditional tracking by ensuring biological safety, strict regulatory compliance, and operational efficiency for donors, medical staff, and laboratory technicians.

**Live Application:** [https://mhmb.vercel.app/](https://mhmb.vercel.app/)

## Key Features
* **Role-Based Workflows:** Distinct, secure portals tailored for Members, Nurses, Lab Staff, and Administrators.
* **Automated Traceability:** Auto-generated tracking numbers (DTN for donations, RTN for requests) for seamless walk-in and registered processing.
* **Safety Integration:** Enforced health screening validations (with automated 3-month validity periods) and rigid pasteurization lab logging, including MBT clearance and automatic discard protocols.
* **Real-Time Inventory & Billing:** Automated volume deduction upon dispensing and dynamic fee calculation (base fee + deposit) to eliminate manual computing errors.
* **Comprehensive Reporting:** Administrators can generate and download system reports (Collections, Processing, Dispensing) in CSV and PDF formats.

## Tech Stack
* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
* **Backend:** Next.js Route Handlers (Serverless API endpoints)
* **Database:** PostgreSQL (hosted serverless on Neon DB)
* **ORM:** Prisma Client (handles database queries and atomic transactions)
* **Authentication:** NextAuth.js (JWT strategy and Credentials provider)
* **Deployment:** Vercel (CI/CD pipeline with Edge Network routing)

## Local Setup Instructions (Prerequisites)
* Node.js: Version 18.x or higher.
* Package Manager: npm, yarn, or pnpm.
