import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Small server endpoint for dev: POST /api/oracle/interpret
function escapeHtml(s) { return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Use canonical prompt builders from core/ai to keep dev middleware consistent with the app
import { buildOracleSystemPrompt, buildOracleUserPrompt } from './src/core/ai/oraclePrompts';



// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    middlewareMode: false,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url && req.url.startsWith('/api/oracle/interpret') && req.method === 'POST') {
        try {
          console.debug('[vite dev middleware] /api/oracle/interpret hit', req.url);
          let raw = '';
          for await (const chunk of req) raw += chunk;
          const body = raw ? JSON.parse(raw) : {};
          const snapshot = body.snapshot;
          const settings = body.settings || {};

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({ success: false, error: 'Server missing OPENAI_API_KEY' }));
            return;
          }

                    // Build prompts using the shared prompt builders
          const systemPrompt = buildOracleSystemPrompt(settings);
          const userPrompt = buildOracleUserPrompt(snapshot, settings.oracleName || 'The Loomwright');

          // Reuse shared OpenAI client helper (same as Dev Table)
          const { callChatModel } = await import('./electron/openaiClient.cjs');
          const apiKeyToUse = process.env.OPENAI_API_KEY;
          const model = settings.model || 'gpt-4o-mini';
          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ];
          try {
            const text = await callChatModel({ apiKey: apiKeyToUse, model, messages });
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({ success: true, text }));
            return;
          } catch (err: any) {
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({ success: false, error: err?.message ?? String(err) }));
            return;
          }
          return;
        } catch (err: any) {
          res.setHeader('Content-Type','application/json');
          res.end(JSON.stringify({ success: false, error: err?.message ?? 'Unknown server error' }));
          return;
        }
      }

      // Generic AI chat proxy used by Dev Table and other renderer code
      if (req.url && req.url.startsWith('/api/ai/chat') && req.method === 'POST') {
        try {
          let raw = '';
          for await (const chunk of req) raw += chunk;
          const body = raw ? JSON.parse(raw) : {};
          const model = body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
          const messages = body.messages || [];
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({ success: false, error: 'Server missing OPENAI_API_KEY' }));
            return;
          }
          const { callChatModel } = await import('./electron/openaiClient.cjs');
          try {
            const text = await callChatModel({ apiKey, model, messages });
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({ success: true, text }));
            return;
          } catch (err: any) {
            res.setHeader('Content-Type','application/json');
            res.end(JSON.stringify({ success: false, error: err?.message ?? String(err) }));
            return;
          }
        } catch (err: any) {
          res.setHeader('Content-Type','application/json');
          res.end(JSON.stringify({ success: false, error: err?.message ?? 'Unknown server error' }));
          return;
        }
      }
      next();
    });
  }
})
