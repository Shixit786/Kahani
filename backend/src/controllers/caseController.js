import Case from '../models/Case.js';
import Evidence from '../models/Evidence.js';

// ---------------------------------------------------------------------------
// GET /api/cases
// ---------------------------------------------------------------------------
export async function listCases(req, res, next) {
  try {
    const cases = await Case.find().sort({ createdAt: -1 }).lean();

    // Attach evidenceCount for each case in one aggregation
    const ids = cases.map((c) => c._id);
    const counts = await Evidence.aggregate([
      { $match: { caseId: { $in: ids } } },
      { $group: { _id: '$caseId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    const result = cases.map((c) => ({
      ...c,
      evidenceCount: countMap[String(c._id)] ?? 0,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/cases
// ---------------------------------------------------------------------------
export async function createCase(req, res, next) {
  try {
    const { title, description, partyName, partyAddress } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!partyName?.trim()) {
      return res.status(400).json({ error: 'partyName is required' });
    }

    const newCase = await Case.create({ title, description, partyName, partyAddress });
    res.status(201).json(newCase);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/cases/:id
// ---------------------------------------------------------------------------
export async function getCase(req, res, next) {
  try {
    const found = await Case.findById(req.params.id).lean();
    if (!found) return res.status(404).json({ error: 'Case not found' });

    const evidenceList = await Evidence.find({ caseId: found._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ...found, evidence: evidenceList });
  } catch (err) {
    next(err);
  }
}
