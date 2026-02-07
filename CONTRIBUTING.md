# Contributing to FinanceAI Pro

Thank you for your interest in contributing! This document outlines the guidelines for contributing to this financial application.

## 🔒 Security First

> **CRITICAL**: This is a financial application. Security is non-negotiable.

Before submitting any code, ensure you have read our [Security Policy](SECURITY.md).

## 📋 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Report security issues privately

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Local Development
```bash
# Clone the repository
git clone https://github.com/jifste/sistema-financiero.git
cd sistema-financiero

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Adding tests |
| `chore` | Maintenance tasks |
| `security` | Security-related changes |

### Examples
```bash
feat(auth): add Google OAuth integration
fix(parser): handle Excel dates correctly
security(deps): update vulnerable dependency
```

## 🔍 Pull Request Process

### Before Submitting

1. **Run tests** (when available)
   ```bash
   npm test
   ```

2. **Check for lint errors**
   ```bash
   npm run lint
   ```

3. **Verify build passes**
   ```bash
   npm run build
   ```

4. **Update documentation** if needed

### PR Requirements

- [ ] Clear, descriptive title following commit guidelines
- [ ] Description of changes and motivation
- [ ] Screenshots for UI changes
- [ ] Tests for new features
- [ ] No console.log statements in production code
- [ ] No hardcoded credentials or API keys

### Review Process

1. Automated checks must pass
2. At least 1 approval required
3. Security-sensitive changes require senior review
4. All conversations must be resolved

## 🛡️ Security Requirements

### Mandatory for All PRs

- **No secrets in code**: Use environment variables
- **Input validation**: Validate all user inputs
- **SQL injection prevention**: Use parameterized queries
- **XSS prevention**: Sanitize all outputs
- **CSRF protection**: Use tokens where applicable

### Prohibited Practices

❌ Committing `.env` files
❌ Hardcoding API keys
❌ Using `eval()` or similar
❌ Disabling security headers
❌ Storing passwords in plain text

## 📁 Project Structure

```
sistema-financiero/
├── api/            # Vercel serverless functions
├── backend/        # Express server (optional)
├── components/     # Reusable React components
├── services/       # Business logic
├── src/
│   ├── components/ # Feature components
│   ├── contexts/   # React contexts (Auth, etc.)
│   ├── lib/        # Utilities (Supabase, etc.)
│   └── services/   # Data services
└── App.tsx         # Main application
```

## ❓ Questions?

- Open a GitHub Discussion for general questions
- Create an Issue for bugs or feature requests
- Email security@[domain].com for security concerns
