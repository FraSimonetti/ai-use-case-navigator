# Contributing to EU AI Act Navigator

Thank you for your interest in contributing to the EU AI Act Navigator! This guide will help you get started.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Issues

- Check if the issue already exists in GitHub Issues
- Provide a clear description of the problem
- Include steps to reproduce (if applicable)
- Specify your environment (browser, OS, etc.)

### Regulatory Content Contributions

We especially welcome contributions that improve the regulatory mapping accuracy:

1. **Risk Classification Updates**: If you identify incorrect risk classifications, please provide:
   - The use case affected
   - The correct classification with legal justification
   - Reference to specific EU AI Act articles

2. **Obligation Updates**: For missing or incorrect obligations:
   - Identify the regulation (EU AI Act, GDPR, or DORA)
   - Provide the specific article reference
   - Include the obligation text and practical implementation guidance

3. **Use Case Additions**: To add new financial services use cases:
   - Describe the use case clearly
   - Classify the risk level with justification
   - Reference applicable Annex III points (if high-risk)

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Test your changes locally**
5. **Commit with clear messages**: `git commit -m "Add: description of change"`
6. **Push to your fork**: `git push origin feature/your-feature`
7. **Open a Pull Request**

### Development Setup

#### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or yarn

#### Frontend (Next.js)
```bash
cd apps/web
npm install
npm run dev  # Runs on http://localhost:3000
```

#### Backend (FastAPI)
```bash
cd services/api
pip install -r requirements.txt
uvicorn main:app --reload  # Runs on http://localhost:8000
```

### Pull Request Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- For regulatory changes, cite specific articles
- Ensure the app builds without errors

## Areas Where We Need Help

- [ ] Adding more financial services use cases
- [ ] Improving DORA obligation mappings
- [ ] Adding GPAI (General Purpose AI) obligations
- [ ] Translating to other EU languages
- [ ] Adding more example questions for Q&A
- [ ] Writing tests
- [ ] Improving documentation

## Questions?

Open an issue or start a discussion on GitHub.

## Legal Note

By contributing to this project, you agree that your contributions will be licensed under the MIT License. Please ensure any regulatory interpretations are well-researched and properly cited.
