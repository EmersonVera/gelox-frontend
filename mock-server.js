/**
 * Servidor mock para desarrollo frontend.
 * Simula los endpoints del backend Spring Boot.
 * Uso: node mock-server.js
 */
import http from 'http';

const PORT = 8080;

const PERFIL_MOCK = {
  id: 1,
  nombre: 'Ayde Arévalo',
  correo: 'ayde.arevalo@gelox.com.co',
  telefono: '+57 312 456 7890',
  foto_url: null,
  rol: 'ADMINISTRADOR',
};

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function send(res, status, data) {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const url = req.url ?? '';
  console.log(`[mock] ${req.method} ${url}`);

  // POST /api/auth/verificar — verifica token Firebase y devuelve perfil
  if (req.method === 'POST' && url === '/api/auth/verificar') {
    return send(res, 200, PERFIL_MOCK);
  }

  // POST /api/perfil/:id/cambiar-contrasena
  const cambiarMatch = url.match(/^\/api\/perfil\/(\d+)\/cambiar-contrasena$/);
  if (req.method === 'POST' && cambiarMatch) {
    const body = await readBody(req);
    if (!body.contrasenaActual) {
      return send(res, 400, { mensaje: 'La contraseña actual es requerida' });
    }
    // Simula contraseña actual incorrecta si se envía "wrongpassword"
    if (body.contrasenaActual === 'wrongpassword') {
      return send(res, 400, { mensaje: 'La contraseña actual es incorrecta' });
    }
    return send(res, 200, { mensaje: 'Contraseña actualizada correctamente' });
  }

  // PUT /api/perfil/:id — actualiza datos del perfil
  const perfilMatch = url.match(/^\/api\/perfil\/(\d+)$/);
  if (req.method === 'PUT' && perfilMatch) {
    const contentType = req.headers['content-type'] ?? '';

    if (contentType.includes('multipart/form-data')) {
      // Simula éxito de upload de foto
      return send(res, 200, {
        ...PERFIL_MOCK,
        foto_url: 'https://i.pravatar.cc/150?img=47',
      });
    }

    const body = await readBody(req);
    return send(res, 200, { ...PERFIL_MOCK, ...body });
  }

  // 404 para todo lo demás
  send(res, 404, { mensaje: 'Endpoint no encontrado en el mock' });
});

server.listen(PORT, () => {
  console.log(`\n✓ Mock server corriendo en http://localhost:${PORT}`);
  console.log('  POST /api/auth/verificar  → devuelve perfil ADMINISTRADOR');
  console.log('  PUT  /api/perfil/:id      → actualiza perfil / sube foto\n');
});
