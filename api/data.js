import { put, list } from '@vercel/blob';

const DATABASE_FILE = 'database.json';

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
    
    if (req.method === 'POST') {
      const { type, payload } = req.body;
      if (type === 'application') {
        db.applications.push({ ...payload, id: Date.now() });
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
    
    await saveDb(db);
    return res.status(200).json({ success: true, db });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: 'Ha ocurrido un error en el servidor.' });
  }
}

async function getDb() {
  try {
    const { blobs } = await list({ prefix: DATABASE_FILE, limit: 1 });
    if (blobs.length === 0) return null;
    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) { return null; }
}

async function saveDb(data) {
  await put(DATABASE_FILE, JSON.stringify(data, null, 2), { access: 'public', contentType: 'application/json' });
}

function getInitialData() {
    const players = [
        { id: 1, name: 'Saul', position: 'MC', number_current: 5, number_new: null, isExpelled: false },
        { id: 2, name: 'Enrique', position: 'DC', number_current: 11, number_new: null, isExpelled: false },
        { id: 3, name: 'Eleonor', position: 'MCO', number_current: 10, number_new: null, isExpelled: false },
        { id: 4, name: 'Masias', position: 'DFC', number_current: 4, number_new: null, isExpelled: false },
        { id: 5, name: 'Angel Cueto', position: 'ED', number_current: 77, number_new: null, isExpelled: false },
        { id: 6, name: 'Pineda', position: 'DC', number_current: 9, number_new: null, isExpelled: false },
        { id: 7, name: 'Kevin', position: 'LTD', number_current: null, number_new: null, isExpelled: false },
        { id: 8, name: 'Brandito', position: 'DFC', number_current: 47, number_new: null, isExpelled: false },
        { id: 9, name: 'Iam', position: 'MCD', number_current: 20, number_new: null, isExpelled: false },
        { id: 10, name: 'Jeshua', position: 'POR', number_current: 1, number_new: null, isExpelled: false },
        { id: 11, name: 'Oliver', position: 'MC', number_current: 8, number_new: null, isExpelled: false },
        { id: 12, name: 'Roger', position: 'EI', number_current: null, number_new: null, isExpelled: false },
        { id: 13, name: 'Sinue', position: 'LTI', number_current: null, number_new: null, isExpelled: false }
    ];

  const playersWithStats = players.map(p => ({
      ...p,
      stats: { goles: 0, partidos: 0, asistencias: 0 }
  }));
  
  return { players: playersWithStats, applications: [], selections: [] };
}
