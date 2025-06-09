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
      res.status(200).json(db);
    } 
    else if (req.method === 'POST') {
      const { type, payload } = req.body;
      if (type === 'application') db.applications.push({ ...payload, id: Date.now() });
      else if (type === 'selection') db.selections.push({ ...payload, id: Date.now(), date: new Date().toLocaleDateString() });
      else return res.status(400).json({ error: 'Tipo de POST inválido' });
      await saveDb(db);
      res.status(200).json(payload);
    }
    else if (req.method === 'PUT') {
      const { type, payload } = req.body;
      if (type === 'players') db.players = payload;
      else if (type === 'applications') db.applications = payload;
      else return res.status(400).json({ error: 'Tipo de PUT inválido' });
      await saveDb(db);
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

async function getDb() {
  try {
    const { blobs } = await list({ prefix: DATABASE_FILE, limit: 1 });
    if (blobs.length === 0) return null;
    const response = await fetch(blobs[0].url);
    return await response.json();
  } catch (error) { return null; }
}

async function saveDb(data) {
  await put(DATABASE_FILE, JSON.stringify(data, null, 2), { access: 'public', contentType: 'application/json' });
}

function getInitialData() {
  return {
    players: [
        { id: 1, name: 'Saul', number: 5, goals: 0 }, { id: 2, name: 'Enrique', number: 11, goals: 0 },
        { id: 3, name: 'Eleonor', number: 10, goals: 0 }, { id: 4, name: 'Masias', number: 4, goals: 0 },
        { id: 5, name: 'Angel Cueto', number: 77, goals: 0 }, { id: 6, name: 'Pineda', number: 9, goals: 0 },
        { id: 7, name: 'Kevin', number: null, goals: 0 }, { id: 8, name: 'Brandito', number: 47, goals: 0 },
        { id: 9, name: 'Iam', number: 20, goals: 0 }, { id: 10, name: 'Jeshua', number: 1, goals: 0 },
        { id: 11, name: 'Oliver', number: 8, goals: 0 }, { id: 12, name: 'Roger', number: null, goals: 0 },
        { id: 13, name: 'Sinue', number: null, goals: 0 }
    ],
    applications: [],
    selections: [],
  };
}
