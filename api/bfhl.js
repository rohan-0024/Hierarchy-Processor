/**
 * Vercel Serverless Function — POST /bfhl
 * Also handles GET /bfhl → { operation_code: 1 }
 */
const { processData } = require('../lib/processData');

const USER_ID = 'rohanpaul_13092004';
const EMAIL_ID = 'rp3387@srmist.edu.in';
const COLLEGE_ROLL_NUMBER = 'RA2311028010024';

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET /bfhl
  if (req.method === 'GET') {
    return res.status(200).json({ operation_code: 1 });
  }

  // POST /bfhl
  if (req.method === 'POST') {
    const { data } = req.body || {};

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'Invalid request. "data" must be an array of strings.'
      });
    }

    const result = processData(data);

    return res.status(200).json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL_NUMBER,
      hierarchies: result.hierarchies,
      invalid_entries: result.invalid_entries,
      duplicate_edges: result.duplicate_edges,
      summary: result.summary
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
