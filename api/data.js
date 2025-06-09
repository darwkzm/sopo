import { put, head, del } from '@vercel/blob';

const DATABASE_FILE = 'database.json';

// Lógica de la API para manejar la base de datos en Vercel Blob
export default async function handler(req, res) {
    try {
        let db = await getDb();
        if (!db) {
            db = getInitialData();
            await saveDb(db);
        }
        
        if (req.method === 'GET') {
            return res.status(200).json(db);
        } 
        
        // El resto de la lógica POST y PUT se mantiene igual
        if (req.method === 'POST') {
            const { type, payload } = req.body;
            if (type === 'application') {
                db.applications.push({ ...payload, id: Date.now() });
            } else if (type === 'new_player') {
                const newId = db.players.length > 0 ? Math.max(...db.players.map(p => p.id)) + 1 : 1;
                const newPlayer = {
                    id: newId, name: payload.name, position: payload.position, skill: payload.skill,
                    number_current: payload.number_current, number_new: null, isExpelled: false,
                    stats: { goles: 0, partidos: 0, asistencias: 0 }
                };
                db.players.push(newPlayer);
            } else {
                return res.status(400).json({ error: 'Tipo de POST inválido' });
            }
        }
        else if (req.method === 'PUT') {
            const { type, payload } = req.body;
            if (type === 'players') db.players = payload;
            else if (type === 'applications') db.applications = payload;
            else return res.status(400).json({ error: 'Tipo de PUT inválido' });
        }
        else {
            return res.setHeader('Allow', ['GET', 'POST', 'PUT']).status(405).end(`Método ${req.method} no permitido`);
        }
        
        await saveDb(db); // Guarda los cambios en el archivo de Blob
        return res.status(200).json({ success: true, db });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: 'Ha ocurrido un error en el servidor.' });
    }
}

// --- Funciones auxiliares para Vercel Blob ---
async function getDb() {
  try {
    // Usamos head para ver si el archivo específico existe
    const blob = await head(DATABASE_FILE);
    // IMPORTANTE: Se añade { cache: 'no-store' } para evitar el caché
    const response = await fetch(blob.url, { cache: 'no-store' });
    return await response.json();
  } catch (error) {
    // Si el error es 404, significa que el archivo no existe, lo cual es normal la primera vez.
    if (error.status === 404) {
        return null;
    }
    // Para otros errores, los mostramos.
    console.error("Error obteniendo la base de datos:", error);
    throw error;
  }
}

async function saveDb(data) {
  // CORRECCIÓN CRÍTICA: Se añade addRandomSuffix: false
  await put(DATABASE_FILE, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false, // Evita que se creen archivos con nombres aleatorios
  });
}

// Datos iniciales con la estructura final
function getInitialData() { /* ... (sin cambios) ... */ }
