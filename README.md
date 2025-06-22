# CivicTwin 🏛️

**AI-powered policy impact analysis for congressmen and legislative staff**

CivicTwin uses artificial intelligence and Census data to simulate how policies affect real constituents. Upload a bill, meet digital twins, and get actionable feedback before implementation.

## ✨ Features

- **🔐 Congressional Authentication** - Secure login for congressmen and staff
- **📄 Policy Upload & Analysis** - Upload documents or paste text for AI analysis
- **👥 Digital Twin Generation** - Create realistic constituents based on Census data
- **💬 Interactive Chat** - Talk with digital twins about policy impact
- **📊 Impact Analysis** - Get detailed reports and improvement suggestions
- **🏛️ Personalized Dashboard** - District-specific insights and quick actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/civictwin.git
   cd civictwin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Add your OpenAI API key to `.env`:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔑 Demo Credentials

Use these demo accounts to test the application:

| Congressman | Email | Password | District |
|-------------|-------|----------|----------|
| Rep. Sarah Johnson | `sarah.johnson@congress.gov` | `password123` | CA-12 |
| Rep. Michael Chen | `michael.chen@congress.gov` | `password123` | NY-08 |
| Rep. Emily Rodriguez | `emily.rodriguez@congress.gov` | `password123` | TX-29 |
| Rep. David Thompson | `david.thompson@congress.gov` | `password123` | FL-27 |

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management

### AI Integration
- **OpenAI GPT-3.5-turbo** for policy analysis
- **Fallback analysis** when API is unavailable
- **Rate limiting protection** with exponential backoff

### Key Components
- `AuthContext` - Congressional authentication
- `AppContext` - Application state management
- `aiService` - AI-powered analysis functions
- `censusApi` - Demographic data integration

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React contexts for state management
├── pages/              # Main application pages
├── services/           # API and external service integrations
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **New Pages**: Add to `src/pages/` and update routing in `App.tsx`
2. **New Components**: Add to `src/components/` for reusable UI
3. **New Services**: Add to `src/services/` for external integrations
4. **New Types**: Add to `src/types/index.ts` for TypeScript definitions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for AI capabilities
- **US Census Bureau** for demographic data
- **React Team** for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework

## 📞 Support

For support, email support@civictwin.com or open an issue on GitHub.

---

**Built with ❤️ for better policy making** 