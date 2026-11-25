// Dapur Senja — a tiny static server for local playtesting.
// Serves game/ at http://localhost:8080 so the game can be opened in desktop Chrome.
// Run: node serve.ts
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = createServer(async (req, res) => {
  try {
    const path = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
    const file = join(here, 'game', path);
    const ext = path.slice(path.lastIndexOf('.'));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(8080, () => console.log('Dapur Senja at http://localhost:8080'));
