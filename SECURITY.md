# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of FinanceAI Pro seriously. If you discover a security vulnerability, please follow these steps:

### 📧 Contact

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report them privately:

- **Email**: security@[your-domain].com
- **Subject**: `[SECURITY] Brief description of the issue`

### 📋 Information to Include

Please include as much of the following information as possible:

1. **Type of vulnerability** (e.g., XSS, SQL Injection, Authentication Bypass)
2. **Location** of the affected source code (file path, line numbers if known)
3. **Step-by-step instructions** to reproduce the issue
4. **Proof-of-concept or exploit code** (if possible)
5. **Impact assessment** of the vulnerability

### ⏱️ Response Timeline

| Action | Timeline |
|--------|----------|
| Initial Response | 48 hours |
| Issue Triage | 5 business days |
| Security Patch | 30 days (critical), 90 days (non-critical) |

### 🎁 Recognition

We acknowledge security researchers who help keep our users safe:

- Credit in release notes (with your permission)
- Entry in our Security Hall of Fame

## Security Best Practices for Contributors

### Sensitive Data Handling
- **NEVER** commit `.env` files, API keys, or credentials
- All financial data must be encrypted at rest and in transit
- PII must be handled according to local regulations

### Code Review Requirements
- All changes to authentication/authorization require senior review
- Database queries must use parameterized statements
- Input validation is mandatory on all user inputs

### Dependencies
- Dependencies are reviewed for known vulnerabilities
- `npm audit` must pass before merge
- Critical dependency updates within 48 hours

## Compliance

This project follows:
- OWASP Top 10 security guidelines
- Chilean data protection regulations (Ley 19.628)
- Financial data handling best practices
