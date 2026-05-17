# Deploying SafeRoute_Admin

Since `SafeRoute_Admin` is a React application built with Vite, deploying it involves generating a production build and serving the static files.

## 1. Prepare the Application for Production
Before deploying, ensure all dependencies are installed and the project builds successfully.

1. Navigate to the admin project directory:
   ```bash
   cd c:\SafeRoute\SafeRoute_Admin
   ```
2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```
3. Create the production build:
   ```bash
   npm run build
   ```
   This will compile the TypeScript code and bundle the React application into a new `dist/` folder. This `dist/` folder contains everything you need to deploy.

## 2. Choose a Deployment Platform

You have several great options for deploying a Vite SPA (Single Page Application). Here are the easiest platforms:

### Option A: Vercel (Recommended)
Vercel is optimized for frontend frameworks and requires almost zero configuration.
1. Install the Vercel CLI: `npm i -g vercel`
2. Run the deployment command inside the `SafeRoute_Admin` directory:
   ```bash
   npx vercel
   ```
3. Follow the CLI prompts. Vercel will automatically detect that it's a Vite project, build it, and deploy it to a live URL.

### Option B: Netlify
Netlify is another excellent option for static sites.
1. Install the Netlify CLI: `npm install -g netlify-cli`
2. Run the deployment command:
   ```bash
   netlify deploy
   ```
3. When prompted, set the publish directory to `dist`.
4. To deploy to production, run `netlify deploy --prod`.

### Option C: Traditional Server (Nginx / Apache)
If you are hosting on your own VPS (Virtual Private Server) like DigitalOcean or AWS EC2:
1. Run `npm run build` locally or on the server.
2. Copy the contents of the `dist/` folder to your web server's public directory (e.g., `/var/www/html/saferoute-admin`).
3. Configure your server to route all traffic to `index.html` to support React Router (SPA routing).

**Example Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html/saferoute-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 3. Verify Deployment
Once deployed, visit your provided URL and check:
- Do the maps load correctly? (Ensure any API keys are added to your hosting platform's environment variables if necessary).
- Can you switch between tabs?
- Ensure the production URL is working smoothly.
