# CivicTwin 🏛️

**AI-powered policy impact analysis for congressmen and legislative staff**

CivicTwin uses artificial intelligence and Census data to simulate how policies affect real constituents. Upload a bill, meet digital twins, and get actionable feedback before implementation.

## ✨ Features

- **🔐 Secure Authentication** - JWT-based authentication with Supabase backend
- **📄 Policy Upload & Analysis** - Upload documents or paste text for AI analysis
- **👥 Digital Twin Generation** - Create realistic constituents based on Census data
- **💬 Interactive Chat** - Talk with digital twins about policy impact
- **📊 Impact Analysis** - Get detailed reports and improvement suggestions
- **🏛️ Personalized Dashboard** - District-specific insights and quick actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/syedahibahasan/civic-twin.git
   cd civic-twin
   ```

2. **Frontend Setup**
   ```bash
   # Install dependencies
   npm install

   # Set up environment variables
   cp .env.example .env
   ```
   
   Add your API configuration to `.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Backend Setup**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Run setup script (Linux/Mac)
   chmod +x setup.sh
   ./setup.sh
   
   # Or manually install dependencies
   npm install
   
   # Configure environment variables
   cp env.example .env
   ```
   
   Edit `backend/.env` with your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_jwt_secret_key_here
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Database Setup**
   
   Create a `users` table in your Supabase database:
   ```sql
   CREATE TABLE users (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     name VARCHAR(255) NOT NULL,
     state VARCHAR(100),
     district VARCHAR(50),
     party VARCHAR(100),
     phone VARCHAR(50),
     committee TEXT,
     avatar TEXT,
     term_start DATE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE INDEX idx_users_email ON users(email);
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```

5. **Start the Servers**
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run dev
   
   # Terminal 2: Start frontend
   cd ..
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔑 Authentication

The application now uses secure JWT-based authentication with Supabase:

- **Registration**: Create new accounts with email, password, and profile information
- **Login**: Authenticate with email and password
- **Profile Management**: Update personal information and change passwords
- **Secure Routes**: Protected pages require authentication
- **Token Persistence**: Automatic login with stored tokens

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management

### Backend
- **Node.js** with Express
- **Supabase** for database and authentication
- **JWT** for secure token-based authentication
- **bcrypt** for password hashing
- **CORS** and security middleware

### AI Integration
- **OpenAI GPT-3.5-turbo** for policy analysis
- **Fallback analysis** when API is unavailable
- **Rate limiting protection** with exponential backoff

### Key Components
- `AuthContext` - Authentication state management
- `authService` - Backend API integration
- `AppContext` - Application state management
- `aiService` - AI-powered analysis functions
- `censusApi` - Demographic data integration

## 📁 Project Structure

```
civic-twin/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── context/           # React context providers
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── types/             # TypeScript type definitions
├── backend/               # Backend API
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   └── index.js       # Main server file
│   ├── package.json       # Backend dependencies
│   └── README.md          # Backend documentation
├── package.json           # Frontend dependencies
└── README.md              # This file
```

## 🔧 Development

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

#### Backend
- `cd backend && npm run dev` - Start backend with auto-restart
- `cd backend && npm start` - Start production backend

### API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout user
- `GET /health` - Server status

For detailed API documentation, see [backend/README.md](backend/README.md)

### Adding New Features

1. **New Pages**: Add to `src/pages/` and update routing in `App.tsx`
2. **New Components**: Add to `src/components/` for reusable UI
3. **New Services**: Add to `src/services/` for external integrations
4. **New API Routes**: Add to `backend/src/routes/` for backend endpoints
5. **New Types**: Add to `src/types/index.ts` for TypeScript definitions

## 🔒 Security Features

- **Password Hashing**: All passwords are hashed using bcrypt with 12 salt rounds
- **JWT Tokens**: Secure token-based authentication with 7-day expiration
- **CORS Protection**: Configured to allow only specified origins
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security Headers**: Helmet middleware for protection against common vulnerabilities
- **Input Validation**: Request body validation for all endpoints

## 🚀 Deployment

### Frontend Deployment

The frontend can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

### Backend Deployment

The backend can be deployed to:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS EC2
- Google Cloud Run

Remember to:
1. Set `NODE_ENV=production`
2. Configure all environment variables
3. Set up proper CORS origins
4. Use a process manager like PM2 for production

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
- **Supabase** for database and authentication
- **US Census Bureau** for demographic data
- **React Team** for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework

## 📞 Support

For support, email support@civictwin.com or open an issue on GitHub.

---

**Built with ❤️ for better policy making**
