# oh-my-patent Documentation Hub

Welcome to the oh-my-patent documentation hub! This directory contains detailed technical documentation and visualization diagrams for the project.

## 📚 Documentation Index

### Core Documentation

- **[README.md](../README.md)** - Main project documentation (English)
  - Installation guide
  - Quick start
  - Full usage
  - Uninstallation guide
  - End-to-end workflow diagram

- **[README.zh-CN.md](../README.zh-CN.md)** - Main project documentation (Chinese)
  - Installation guide
  - Quick start
  - Full usage
  - Uninstallation guide
  - End-to-end workflow diagram

- **[CLAUDE.md](../CLAUDE.md)** - Claude Code project instructions
  - Project architecture deep-dive
  - Development workflow
  - Quality metrics
  - Release process

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
  - Code style
  - Testing requirements
  - Commit conventions
  - PR process

### Visualization Diagrams

- **[workflow-diagram.md](workflow-diagram.md)** - Workflow diagrams (Chinese)
  - 🔄 End-to-End Workflow
  - 🏗️ System Architecture
  - 🤖 Agent Collaboration
  - 📊 Decision Path Data Structure
  - 📁 File System Layout
  - 🔀 Workflow State Machine

- **[workflow-diagram-en.md](workflow-diagram-en.md)** - Workflow diagrams (English)
  - 🔄 End-to-End Workflow
  - 🏗️ System Architecture
  - 🤖 Agent Collaboration
  - 📊 Decision Path Data Structure
  - 📁 File System Layout
  - 🔀 Workflow State Machine

### Specification Documents

- **[specs/](specs/)** - Product specifications and technical design documents
  - **[PRD.md](specs/PRD.md)** - Product Requirements Document
  - **[TECHNICAL-DESIGN.md](specs/TECHNICAL-DESIGN.md)** - Technical Design Specification
  - **[API-DESIGN.md](specs/API-DESIGN.md)** - API Design Document
  - **[README.md](specs/README.md)** - Specification Index

## 🎯 Quick Navigation

### I want to...

#### Understand how to use oh-my-patent
- 👉 Read the "Quick Demo" and "Installation" sections in [README.md](../README.md)
- 👉 View the end-to-end workflow diagram in [workflow-diagram-en.md](workflow-diagram-en.md)

#### Understand the system architecture
- 👉 Read the "Architecture Highlights" section in [CLAUDE.md](../CLAUDE.md)
- 👉 View the system architecture and agent collaboration diagrams in [workflow-diagram-en.md](workflow-diagram-en.md)

#### Contribute code
- 👉 Read [CONTRIBUTING.md](../CONTRIBUTING.md)
- 👉 Learn about the "Development Workflow" and "Tech Stack" in [CLAUDE.md](../CLAUDE.md)

#### Uninstall oh-my-patent
- 👉 Read the "Uninstallation" section in [README.md](../README.md)
- 👉 Use command: `oh-my-patent adapt uninstall --workspace-dir .`

#### Understand the decision path system
- 👉 View the decision path data structure diagram in [workflow-diagram-en.md](workflow-diagram-en.md)
- 👉 Read the "Decision Path System" section in [CLAUDE.md](../CLAUDE.md)

#### Understand the workflow state machine
- 👉 View the workflow state machine diagram in [workflow-diagram-en.md](workflow-diagram-en.md)
- 👉 Read the "The Workflow" section in [README.md](../README.md)

## 📖 Diagram Viewing Guide

### On GitHub
GitHub natively supports Mermaid rendering. Simply view the `.md` files in the repository to see the full visualizations.

### Local Viewing
Use a Markdown editor with Mermaid support:

#### VS Code
```bash
# Install extension
code --install-extension bierner.markdown-mermaid
```

#### Other Editors
- **Obsidian** - Native Mermaid support
- **Typora** - Native Mermaid support
- **GitHub Desktop** - Native Mermaid support

### Export as Images
Using Mermaid CLI:

```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Export as PDF
mmdc -i docs/workflow-diagram-en.md -o docs/workflow-diagram-en.pdf

# Export as PNG
mmdc -i docs/workflow-diagram-en.md -o docs/workflow-diagram-en.png -w 2400
```

Or use online editors:
- [Mermaid Live Editor](https://mermaid.live/)
- [Mermaid Chart](https://www.mermaidchart.com/)

## 🔗 External Resources

### Official Links
- **npm**: https://www.npmjs.com/package/oh-my-patent
- **GitHub**: https://github.com/illusionaireal/oh-my-patent
- **Issues**: https://github.com/illusionaireal/oh-my-patent/issues

### Community Support
- **LINUX DO Community**: https://linux.do/
- **Discussions**: GitHub Discussions (coming soon)

### Technical Documentation
- **Mermaid Syntax**: https://mermaid.js.org/
- **TypeScript**: https://www.typescriptlang.org/
- **Vitest**: https://vitest.dev/
- **Node.js**: https://nodejs.org/

## 📝 Documentation Maintenance

### Updating Documentation
If you find errors or areas for improvement in the documentation:

1. Fork this repository
2. Create a feature branch: `git checkout -b docs/improve-xxx`
3. Make your changes
4. Commit: `git commit -m "docs: improve xxx documentation"`
5. Push: `git push origin docs/improve-xxx`
6. Create a Pull Request

### Documentation Standards
- Use Markdown format
- Bilingual support (Chinese and English)
- Code examples use ```bash or ```typescript markers
- Diagrams use Mermaid syntax
- Keep documentation concise and clear

## ❓ Getting Help

If you encounter issues:

1. 📖 First, consult this documentation index to find relevant sections
2. 🔍 Search for similar issues in [Issues](https://github.com/illusionaireal/oh-my-patent/issues)
3. 💬 Start a discussion in the [LINUX DO Community](https://linux.do/)
4. 🐛 If it's a bug, create a new Issue

## 📜 License

This project and its documentation are licensed under the [MIT License](../LICENSE).

---

**Current Version**: v0.1.0  
**Last Updated**: 2026-06-17  
**Maintainer**: [@zengbods](https://github.com/zengbods)
