import CustodyEvent from '../models/CustodyEvent.js';
import Evidence from '../models/Evidence.js';

// ---------------------------------------------------------------------------
// POST /api/demo/tamper/:evidenceId
// DEMO_MODE only — directly mutates seqNo 2 WITHOUT recomputing hashes,
// so verifyChain() will subsequently detect the break.
// ---------------------------------------------------------------------------
export async function tamper(req, res, next) {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(403).json({ error: 'This endpoint is only available in DEMO_MODE' });
  }

  try {
    const evidence = await Evidence.findById(req.params.evidenceId).lean();
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    const target = await CustodyEvent.findOne({
      evidenceId: evidence._id,
      seqNo: 2,
    }).lean();

    if (!target) {
      return res.status(404).json({
        error: 'No event with seqNo 2 found for this evidence — add at least 2 custody events first',
      });
    }

    // Directly mutate details and timestampIST — intentionally bypassing appendCustodyEvent
    // so entryHash and prevHash are now stale/wrong → verifyChain will catch this.
    await CustodyEvent.updateOne(
      { _id: target._id },
      {
        $set: {
          details: '[TAMPERED] This record was altered directly in the database without rehashing.',
          timestampIST: '01/01/2000 00:00:00 IST',
          actor: 'Unknown Intruder',
        },
      }
    );

    res.json({
      tampered: true,
      evidenceId: String(evidence._id),
      mutatedEventId: String(target._id),
      seqNo: 2,
      message:
        'Event seqNo 2 has been silently mutated. Run GET /api/evidence/:id/verify-chain to detect the break.',
    });
  } catch (err) {
    next(err);
  }
}
