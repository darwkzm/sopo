import { put, list, del } from '@vercel/blob';

// Nombre del archivo que funcionará como nuestra base de datos en Vercel Blob
const DATABASE_FILE = 'database.json';

// --- Función principal de la API ---
export default async function handler(req, res) {
  try {
    // Lee la base de datos actual desde el archivo en Blob
    let db = await getDb();

    // Si la base de datos no existe (primera ejecución), la inicializa
    if (!db) {
      db = getInitialData();
      await saveDb(db);
    }
    
    // --- MANEJO DE PETICIONES ---

    if (req.method === 'GET') {
      res.status(200).json(db);
    } 
    
    else if (req.method === 'POST') {
      const { type, payload } = req.body;
      if (type === 'application') {
        db.applications.push({ ...payload, id: Date.now() });
      } else if (type === 'selection') {
        db.selections.push({ ...payload, id: Date.now(), date: new Date().toLocaleDateString() });
      } else {
        return res.status(400).json({ error: 'Tipo de POST inválido' });
      }
      
      await saveDb(db); // Guarda el archivo completo con los nuevos datos
      res.status(200).json(payload);
    }

    else if (req.method === 'PUT') {
      const { type, payload } = req.body;
      if (type === 'players') {
        db.players = payload;
      } else if (type === 'applications') {
        db.applications = payload;
      } else {
        return res.status(400).json({ error: 'Tipo de PUT inválido' });
      }
      
      await saveDb(db); // Guarda el archivo completo con los nuevos datos
      res.status(200).json(payload);
    }

    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Método ${req.method} no permitido`);
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ha ocurrido un error en el servidor.' });
  }
}


// --- FUNCIONES AUXILIARES PARA MANEJAR BLOB ---

// Obtiene los datos del archivo JSON en Vercel Blob
async function getDb() {
  try {
    const { blobs } = await list({ prefix: DATABASE_FILE, limit: 1 });
    if (blobs.length === 0) return null;
    const response = await fetch(blobs[0].url);
    return await response.json();
  } catch (error) {
    console.error("Error obteniendo la base de datos de Blob:", error);
    return null;
  }
}

// Guarda (sobrescribe) el objeto de base de datos en el archivo JSON de Vercel Blob
async function saveDb(data) {
  await put(DATABASE_FILE, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}

// Devuelve el objeto de datos inicial si la base de datos no existe
function getInitialData() {
  return {
    players: [
        { id: 1, name: 'Saul', number: 5, goals: 8 }, { id: 2, name: 'Enrique', number: 11, goals: 15 },
        { id: 3, name: 'Eleonor', number: 10, goals: 12 }, { id: 4, name: 'Masias', number: 4, goals: 1 },
        { id: 5, name: 'Angel Cueto', number: 77, goals: 5 }, { id: 6, name: 'Pineda', number: 9, goals: 9 },
        { id: 7, name: 'Kevin', number: null, goals: 3 }, { id: 8, name: 'Brandito', number: 47, goals: 0 },
        { id: 9, name: 'Iam', number: 20, goals: 7 }, { id: 10, name: 'Jeshua', number: 1, goals: 0 },
        { id: 11, name: 'Oliver', number: 8, goals: 6 }, { id: 12, name: 'Roger', number: null, goals: 2 },
        { id: 13, name: 'Sinue', number: null, goals: 0 }
    ],
    applications: [],
    selections: [],
  };
}