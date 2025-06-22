# CivicTwin Backend API

A Node.js/Express backend with Supabase authentication for the CivicTwin application.

## Features

- 🔐 JWT-based authentication
- 🗄️ Supabase database integration
- 🔒 Password hashing with bcrypt
- 🛡️ Security middleware (Helmet, CORS, Rate limiting)
- 📝 User registration and login
- 👤 Profile management
- 🔑 Password change functionality

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Copy the environment example file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 3. Supabase Database Setup

Create a `users` table in your Supabase database with the following SQL:

```sql
-- Create users table
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

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Create policy for users to update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Create policy for users to insert their own data
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);
```

### 4. Run the Server

Development mode with auto-restart:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "state": "California",
  "district": "CA-12",
  "party": "Democratic",
  "phone": "(202) 225-1234",
  "committee": "House Committee on Energy and Commerce"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "state": "California",
    "district": "CA-12",
    "party": "Democratic",
    "phone": "(202) 225-1234",
    "committee": "House Committee on Energy and Commerce",
    "avatar": "https://...",
    "term_start": "2024-01-01",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token_here"
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "state": "California",
    "district": "CA-12",
    "party": "Democratic",
    "phone": "(202) 225-1234",
    "committee": "House Committee on Energy and Commerce",
    "avatar": "https://...",
    "term_start": "2024-01-01",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token_here"
}
```

#### GET `/api/auth/profile`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "state": "California",
    "district": "CA-12",
    "party": "Democratic",
    "phone": "(202) 225-1234",
    "committee": "House Committee on Energy and Commerce",
    "avatar": "https://...",
    "term_start": "2024-01-01",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT `/api/auth/profile`
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "state": "New York",
  "district": "NY-08",
  "party": "Republican",
  "phone": "(202) 225-5678",
  "committee": "House Committee on Financial Services"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Smith",
    "state": "New York",
    "district": "NY-08",
    "party": "Republican",
    "phone": "(202) 225-5678",
    "committee": "House Committee on Financial Services",
    "avatar": "https://...",
    "term_start": "2024-01-01",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT `/api/auth/change-password`
Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newsecurepassword"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Health Check

#### GET `/health`
Check server status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (invalid token)
- `404` - Not Found
- `409` - Conflict (user already exists)
- `500` - Internal Server Error

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt with 12 salt rounds
- **JWT Tokens**: Secure token-based authentication with 7-day expiration
- **CORS Protection**: Configured to allow only specified origins
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers for protection against common vulnerabilities
- **Input Validation**: Request body validation for all endpoints

## Development

### Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js      # Supabase client configuration
│   │   └── middleware/
│   │   └── auth.js          # Authentication middleware
│   │   └── routes/
│   │   └── auth.js          # Authentication routes
│   └── index.js             # Main server file
├── package.json
├── env.example
└── README.md
```

### Adding New Routes

1. Create a new route file in `src/routes/`
2. Import and use the route in `src/index.js`
3. Add authentication middleware if needed

### Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed CORS origin

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Ensure all environment variables are configured
3. Run `npm start` to start the production server
4. Consider using a process manager like PM2 for production deployments

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**: Check your environment variables and ensure your Supabase project is active
2. **CORS Errors**: Verify the `CORS_ORIGIN` environment variable matches your frontend URL
3. **JWT Errors**: Ensure `JWT_SECRET` is set and consistent across deployments
4. **Database Errors**: Verify your Supabase table structure matches the expected schema

### Logs

The server logs all errors and important events to the console. In production, consider using a logging service for better monitoring. 