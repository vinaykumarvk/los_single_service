# Supabase Setup for GCloud Deployment

This guide explains how to set up your Supabase database for the GCloud-deployed application.

## 🎯 Overview

Your application uses **Supabase** (PostgreSQL) as the database. The GCloud deployment connects to Supabase using the `DATABASE_URL` secret stored in Google Secret Manager.

**Supabase Project ID**: `orqupfsguquusnethtbt`

---

## 📋 Prerequisites

1. ✅ Supabase project created (already done)
2. ✅ Database password available
3. ✅ `psql` command-line tool installed
4. ✅ GCloud Secret Manager configured with `database-url` secret

---

## 🚀 Setup Steps

### Step 1: Get Your Supabase Database Password

1. Go to: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/database
2. Find the **Database password** section
3. Copy your existing password OR click **Reset database password** if needed
4. **Save this password** - you'll need it for the next step

### Step 2: Update GCloud Secret Manager

Store your Supabase connection string in Google Secret Manager:

```bash
# Format the DATABASE_URL (replace [YOUR-PASSWORD] with actual password)
export SUPABASE_PASSWORD="your-actual-password"
export DATABASE_URL="postgresql://postgres.orqupfsguquusnethtbt:${SUPABASE_PASSWORD}@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"

# Update the secret in GCloud
echo -n "$DATABASE_URL" | gcloud secrets versions add database-url --data-file=- --project=wealth-report
```

### Step 3: Run Database Migrations

Run the migration script to create tables and seed test data:

```bash
cd /Users/n15318/LoS
./scripts/run-migrations-supabase.sh
```

When prompted, enter your Supabase database password.

**What this does:**
- Creates all database tables (users, applications, applicants, etc.)
- Seeds test users (rm1, rm2, rm3, rm4)
- Creates sample applications for testing
- Sets up proper indexes and constraints

### Step 4: Verify Setup

After migrations complete, verify in Supabase:

1. Go to: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/editor
2. Check that these tables exist:
   - `users`
   - `applications`
   - `applicants`
3. Query users table: `SELECT * FROM users WHERE username LIKE 'rm%';`
4. You should see 4 RM users (rm1, rm2, rm3, rm4)

### Step 5: Deploy to GCloud

Push your code to trigger Cloud Build:

```bash
git push origin main
```

Cloud Build will:
1. Build the Docker image
2. Deploy to Cloud Run
3. Connect to Supabase using the DATABASE_URL secret

---

## 🔑 Test Credentials

After setup is complete, you can log in with:

| Username | Password | Role |
|----------|----------|------|
| rm1 | RM@123456 | Relationship Manager |
| rm2 | RM@123456 | Relationship Manager |
| rm3 | RM@123456 | Relationship Manager |
| rm4 | RM@123456 | Relationship Manager |

Each RM user has 10-25 applications assigned for testing.

---

## 🔧 Troubleshooting

### Connection Error
If you get a connection error:
1. Verify your Supabase password is correct
2. Check that your IP is allowed (Supabase allows all IPs by default)
3. Ensure DATABASE_URL in Secret Manager is correctly formatted

### Migration Errors
If a migration fails:
1. Check the error message for the specific issue
2. You may need to drop tables if you want to re-run from scratch
3. Use Supabase SQL Editor to manually fix issues

### Login Not Working
If login fails after deployment:
1. Verify migrations ran successfully
2. Check Cloud Run logs: `gcloud logging read "resource.labels.service_name=los-monolith" --limit=50`
3. Ensure DATABASE_URL secret is accessible by Cloud Run service account

---

## 📊 Database Schema

The migrations create:

### Core Tables
- **users**: Authentication and user management
- **applicants**: Customer/borrower information
- **applications**: Loan applications
- **documents**: Document management
- **notes**: Application notes and comments

### Master Data
- **products**: Loan products
- **branches**: Branch information
- **rate_matrices**: Interest rate configurations
- **charges**: Fee structures

### Supporting Tables
- **refresh_tokens**: JWT refresh tokens
- **kyc_sessions**: KYC verification sessions
- **property_details**: Property information for home loans

---

## 🌐 Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt
- **Database Settings**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/database
- **SQL Editor**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/editor
- **Table Editor**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/editor

---

## ✅ Checklist

Before going live, ensure:

- [ ] Migrations ran successfully
- [ ] Test users can log in
- [ ] Applications are visible in dashboard
- [ ] DATABASE_URL secret is configured in GCloud
- [ ] SUPABASE_SERVICE_ROLE_KEY secret is configured in GCloud
- [ ] Cloud Run service can connect to Supabase
- [ ] Production passwords are changed (not using RM@123456)


