# 🔐 SecureVault - Military-Grade Password Manager

**A secure, offline-first password manager with AES-256 encryption and zero-knowledge architecture.**

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](https://web.dev/progressive-web-apps/)
[![Encryption](https://img.shields.io/badge/Encryption-AES--256-blue.svg)](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
[![Zero Knowledge](https://img.shields.io/badge/Architecture-Zero--Knowledge-purple.svg)](https://en.wikipedia.org/wiki/Zero-knowledge_proof)

## 🌟 Features

### 🛡️ **Military-Grade Security**
- **AES-256 Encryption**: Bank-level security for all your data
- **PBKDF2 Key Derivation**: 100,000+ iterations for maximum protection
- **Zero-Knowledge Architecture**: Your data never leaves your device
- **Offline-First Design**: Works without internet connection

### 🔑 **Password Management**
- **Unlimited Storage**: Store passwords, usernames, and URLs
- **Auto-Generated Passwords**: Cryptographically secure password generation
- **Password Strength Analysis**: Real-time security assessment
- **One-Click Copy**: Secure clipboard management with auto-clear

### 📁 **Multi-Type Vault Storage**
- **🔐 Passwords**: Login credentials with URLs and notes
- **📝 Secure Notes**: Encrypted text storage for sensitive information
- **🏦 Banking Info**: Credit cards, bank accounts, and financial data
- **📄 Document Vault**: Secure file storage with encryption

### 🔒 **Advanced Security Features**
- **Auto-Lock**: Configurable inactivity timeout (1 min to never)
- **Master Password Hints**: Optional recovery hints after failed attempts
- **Secure Session Management**: Automatic logout on close
- **Local-Only Storage**: IndexedDB with client-side encryption

### 📱 **Cross-Platform PWA**
- **Progressive Web App**: Install on any device
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Offline Capability**: Full functionality without internet
- **Service Worker**: Fast loading and offline caching

### 🔄 **Backup & Sync Options**
- **Encrypted Exports**: AES-256 encrypted JSON backups
- **Plaintext Exports**: For migration and analysis
- **Cloud Backup Sharing**: Share encrypted backups to any cloud service
- **Cross-Device Import**: Sync between devices using encrypted files

## 🚀 Quick Start

### Option 1: Use Online (Recommended)
Visit [SecureVault](https://lovable.dev/projects/c3af4669-357a-4c7d-896d-883359c156f1) and start using immediately.

### Option 2: Run Locally
```bash
# Clone the repository
git clone https://github.com/your-username/securevault.git
cd securevault

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔐 Security Architecture

### Encryption Details
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with SHA-256
- **Salt**: 32-byte random salt per item
- **IV**: 12-byte random initialization vector
- **Iterations**: 100,000+ PBKDF2 iterations

### Data Flow
```
Master Password → PBKDF2 → Encryption Key → AES-256-GCM → Encrypted Data → IndexedDB
```

### Zero-Knowledge Design
- **No Server Communication**: All data stays on your device
- **No Telemetry**: Zero tracking or analytics
- **No Cloud Dependencies**: Works completely offline
- **Open Source**: Transparent security implementation

## 📖 How to Use

### 1. **First Time Setup**
1. Choose a strong master password (12+ characters recommended)
2. Optionally add a password hint
3. Click "Create Secure Vault"

### 2. **Adding Items**
1. Click the "+" button or select item type from sidebar
2. Fill in the required information
3. Click "Save" to encrypt and store

### 3. **Managing Items**
- **View**: Click on any item to see details
- **Edit**: Click the edit button on item cards
- **Delete**: Click delete and confirm
- **Copy**: One-click copy for passwords and sensitive data

### 4. **Backup & Restore**
- **Export**: Choose encrypted (recommended) or plaintext backup
- **Cloud Backup**: Share encrypted files to Google Drive, Dropbox, etc.
- **Import**: Restore from any backup file with your master password

### 5. **Security Settings**
- **Auto-Lock**: Configure timeout from 1 minute to never
- **Reset Vault**: Clear all data if you forget your master password

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Build Tool**: Vite
- **Storage**: IndexedDB with encrypted data
- **Crypto**: Web Crypto API (native browser encryption)
- **PWA**: Service Worker + Web App Manifest

## 🔧 API Reference

### Core Services

#### `CryptoService`
```typescript
// Encrypt data with password
const encrypted = await CryptoService.encrypt(data, password);

// Decrypt data with password  
const decrypted = await CryptoService.decrypt(encrypted, password);

// Generate secure password
const password = CryptoService.generatePassword(16);
```

#### `IndexedDBStorage`
```typescript
// Save vault items
await IndexedDBStorage.saveVault(items, masterPassword);

// Load vault items
const items = await IndexedDBStorage.loadVault(masterPassword);

// Export encrypted backup
const backup = await IndexedDBStorage.exportVault(masterPassword, true);

// Import from backup
await IndexedDBStorage.importVault(backupData, masterPassword);
```

## 🛡️ Security Best Practices

### For Users
1. **Strong Master Password**: Use 12+ characters with mixed case, numbers, symbols
2. **Unique Password**: Don't reuse your master password anywhere else
3. **Regular Backups**: Export encrypted backups regularly
4. **Secure Storage**: Store backup files in secure cloud storage
5. **Device Security**: Use device lock screens and encryption

### For Developers
1. **No Plaintext Storage**: All sensitive data encrypted at rest
2. **Secure Random Generation**: Use crypto.getRandomValues()
3. **Constant-Time Comparison**: Prevent timing attacks
4. **Memory Management**: Clear sensitive variables after use
5. **CSP Headers**: Content Security Policy for XSS prevention

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Security Disclosure

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.

## 🙏 Acknowledgments

- **Web Crypto API**: For native browser encryption
- **IndexedDB**: For secure client-side storage
- **shadcn/ui**: For beautiful UI components
- **Lucide Icons**: For comprehensive icon set

## 📞 Support

- **Documentation**: [Read the full docs](https://docs.example.com)
- **Issues**: [GitHub Issues](https://github.com/your-username/securevault/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/securevault/discussions)

---

**⚡ Made with security and privacy in mind. Your data stays yours, always.**