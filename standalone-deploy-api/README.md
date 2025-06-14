# Onlook Deploy API

A standalone API server for Onlook's deploy web functionality, extracted from the main backend and optimized for Vercel deployment.

## Features

- **Web Deployment**: Deploy web applications using Freestyle SDK
- **Domain Management**: Create domain verifications, verify domains, and manage owned domains
- **Authentication**: Supabase-based authentication system
- **Plan Management**: Pro plan verification for premium features
- **Vercel Ready**: Optimized for serverless deployment on Vercel

## API Endpoints

### Deploy Web
- `POST /api/hosting/v2/deploy-web`
- Deploy web applications with files and configuration
- Requires authentication

### Domain Management
- `POST /api/hosting/v2/create-domain-verification` - Create domain verification (Pro plan required)
- `POST /api/hosting/v2/verify-domain` - Verify domain ownership (Pro plan required)  
- `GET /api/hosting/v2/owned-domains` - Get user's owned domains (Pro plan required)

### Health Check
- `GET /health` - API health status

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
FREESTYLE_API_KEY=your_freestyle_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
PORT=3000
NODE_ENV=development
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Set environment variables in Vercel dashboard or CLI:
```bash
vercel env add FREESTYLE_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

4. Redeploy with environment variables:
```bash
vercel --prod
```

## Desktop App Integration

The desktop app can call this API by updating the base URL to point to your deployed Vercel instance:

```typescript
const API_BASE_URL = 'https://your-vercel-deployment.vercel.app';
```

The API maintains the same request/response format as the original backend, ensuring seamless compatibility.

## Architecture

- **Express.js**: Web framework for Node.js
- **TypeScript**: Type safety and better development experience
- **Supabase**: Database and authentication
- **Freestyle SDK**: Web deployment service
- **Vercel**: Serverless deployment platform

## Security

- Helmet.js for security headers
- CORS configuration
- Request size limits (50MB for file uploads)
- Authentication middleware for all protected routes
- Plan verification for premium features

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "message": "Error description"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Onlook ecosystem and follows the same licensing terms.
