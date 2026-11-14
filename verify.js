const crypto = require('crypto');
const { httpError, needConfig, requireUser, settleOrder, route } = require('../_lib');

// Called by the app after checkout, or with just { orderId } to recover a payment if the tab was closed first.
module.exports = route(['POST'], async (req, res) => {
  needConfig();
  const user = await requireUser(req);
  const b = req.body || {};
  const orderId = b.razorpay_order_id || b.orderId;
  if (!orderId) throw httpError(400, 'Missing order id.');

  if (b.razorpay_signature) {
    const expected = Buffer.from(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${b.razorpay_payment_id}`).digest('hex'));
    const given = Buffer.from(String(b.razorpay_signature));
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) throw httpError(400, 'The payment signature didn’t match.');
  }
  const done = await settleOrder(orderId, user.uid);
  res.status(200).json({ ok: true, plan: done.plan });
});
