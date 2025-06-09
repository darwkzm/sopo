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
    
    // Lógica para POST y PUT (sin cambios de la versión anterior)
    if (req.method === 'POST') {
      const { type, payload } = req.body;
      if (type === 'application') db.applications.push({ ...payload, id: Date.now() });
      else if (type === 'selection') {
        const player = db.players.find(p => p.name === payload.playerName);
        if(player) player.number_new = payload.newNumber;
      } 
      else return res.status(400).json({ error: 'Tipo de POST inválido' });
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
    { id: 1, name: 'Saul', number_current: 5, number_new: null }, 
    { id: 2, name: 'Enrique', number_current: 11, number_new: null },
    { id: 3, name: 'Eleonor', number_current: 10, number_new: null },
    { id: 4, name: 'Masias', number_current: 4, number_new: null },
    { id: 5, name: 'Angel Cueto', number_current: 77, number_new: null },
    { id: 6, name: 'Pineda', number_current: 9, number_new: null },
    { id: 7, name: 'Kevin', number_current: null, number_new: null },
    { id: 8, name: 'Brandito', number_current: 47, number_new: null },
    { id: 9, name: 'Iam', number_current: 20, number_new: null },
    { id: 10, name: 'Jeshua', number_current: 1, number_new: null },
    { id: 11, name: 'Oliver', number_current: 8, number_new: null },
    { id: 12, name: 'Roger', number_current: null, number_new: null },
    { id: 13, name: 'Sinue', number_current: null, number_new: null }
  ];

  const playersWithStats = players.map(p => ({
      ...p,
      stats: { goles: 0, partidos: 0, asistencias: 0, velocidad: 70, regate: 70, defensa: 50 }
  }));
  
  return { players: playersWithStats, applications: [], selections: [] };
}
