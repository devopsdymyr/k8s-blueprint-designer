# Contributing to Kubernetes Blueprint Designer

Thank you for your interest in contributing to Kubernetes Blueprint Designer! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/k8s-blueprint-designer.git
   cd k8s-blueprint-designer
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/k8s-blueprint-designer.git
   ```

## 📝 Development Setup

### Backend (Go)
```bash
cd backend
go mod download
go run main.go -port=8080 -cors=true
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

## 🔀 Workflow

1. **Create a branch** for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** and test them thoroughly

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for code refactoring
   - `test:` for tests
   - `chore:` for maintenance

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

## 📋 Pull Request Guidelines

- **Clear description**: Explain what your PR does and why
- **Reference issues**: Link to related issues using `#issue-number`
- **Test coverage**: Include tests for new features
- **Documentation**: Update README/docs if needed
- **Code style**: Follow existing code style and conventions
- **Small PRs**: Keep PRs focused and reasonably sized

## 🧪 Testing

Before submitting a PR, please ensure:
- [ ] Code compiles/runs without errors
- [ ] All existing tests pass
- [ ] New features have tests (if applicable)
- [ ] Manual testing completed
- [ ] No sensitive data or credentials in code

## 📚 Code Style

### Go
- Follow [Effective Go](https://go.dev/doc/effective_go) guidelines
- Use `gofmt` for formatting
- Keep functions focused and small
- Add comments for exported functions

### JavaScript/React
- Follow ESLint rules
- Use functional components with hooks
- Keep components small and focused
- Use meaningful variable names

## 🐛 Reporting Bugs

When reporting bugs, please include:
- **Description**: Clear description of the bug
- **Steps to reproduce**: Detailed steps to reproduce
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Go version, Node version, Kubernetes version
- **Screenshots**: If applicable

## 💡 Feature Requests

Feature requests are welcome! Please:
- Check if the feature already exists
- Explain the use case
- Describe the expected behavior
- Consider implementation complexity

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Your contributions make this project better for everyone. Thank you for taking the time to contribute!

