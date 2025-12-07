# DabotCentral

Authentication platform with Email-OTP and API key management for Dabot services.

## Live URL
https://dabot-central.vercel.app

## Features
- Email-OTP Authentication
- API Key Generation & Management
- Daily Todo API
- Session Management

## API Endpoints
- `/api/health` - Health check
- `/api/daily-todo` - Get/Update daily todo (requires auth)
- `/api/auth/*` - Authentication endpoints
- `/api/admin/*` - Admin endpoints

## Local Development
```bash
npm install
npm run dev:full
```
