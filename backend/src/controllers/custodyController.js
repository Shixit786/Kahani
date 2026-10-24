import Evidence from '../models/Evidence.js';
import CustodyEvent from '../models/CustodyEvent.js';
import { appendCustodyEvent } from '../lib/integrity.js';

const VALID_ROLES = ['Party', 'Lawyer', 'Expert', 'Court'];

// ---------------------------------------------------------------------------
// POST /api/evidence/:id/events
// ---------------------------------------------------------------------------
export async function addCustodyEvent(req, res, next) {
  try {
    const evidence = await Evidence.findById(req.params.id).lean();
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const { action, actor, actorRole, details } = req.body;

    if (!action?.trim()) return res.status(400).json({ error: 'action is required' });
    if (!actor?.trim()) return res.status(400).json({ error: 'actor is required' });
    if (!actorRole) return res.status(400).json({ error: 'actorRole is required' });
    if (!VALID_ROLES.includes(actorRole)) {
      return res.status(400).json({
        error: `actorRole must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    const event = await appendCustodyEvent(evidence._id, {
      action,
      actor,
      actorRole,
      details: details ?? '',
    });

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}
