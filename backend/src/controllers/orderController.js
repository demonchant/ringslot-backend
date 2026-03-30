// src/controllers/orderController.js
import { query, getClient } from '../config/database.js';
import { buyWithFailover, cancelOrder } from '../services/providerRouter.js';
import { applyMarkup } from '../services/markupEngine.js';
import { parseOTP } from '../utils/smsParser.js';
import { enqueue, dequeue } from '../services/otpPoller.js';
import { sendOTPEmail } from '../utils/email.js';
import logger from '../utils/logger.js';

export async function listServices(req, res) {
  try {
    const { rows } = await query(
      `SELECT service_key, display_name, markup
       FROM services
       WHERE is_active = TRUE
       ORDER BY display_name ASC`
    );
    return res.json(rows);
  } catch (err) {
    logger.error('listServices error', { error: err.message });
    return res.status(500).json({ error: 'Could not load services' });
  }
}

export async function buyNumber(req, res) {
  const { service, country = 'any' } = req.body;
  if (!service) return res.status(400).json({ error: 'service is required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id: providerOrderId, number, provider, providerPrice } = await buyWithFailover(service, country);
    const { userPrice } = await applyMarkup(service, providerPrice);
    const profit = parseFloat((userPrice - providerPrice).toFixed(4));

    const { rows: wallet } = await client.query(
      'SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE', [req.user.id]
    );
    if (!wallet[0] || parseFloat(wallet[0].balance) < userPrice) {
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'Insufficient balance', required: userPrice });
    }

    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
      [userPrice, req.user.id]
    );

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, provider, provider_order_id, service, phone_number,
         provider_price, user_price, profit, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, provider, providerOrderId, service, number,
       providerPrice, userPrice, profit, country]
    );
    const order = orderRows[0];

    await client.query(
      `INSERT INTO transactions (user_id, amount, type, reference) VALUES ($1,$2,'deduct',$3)`,
      [req.user.id, -userPrice, `Order ${order.id}`]
    );
    await client.query(
      `INSERT INTO platform_revenue (order_id, provider_cost, user_paid, service, provider)
       VALUES ($1,$2,$3,$4,$5)`,
      [order.id, providerPrice, userPrice, service, provider]
    );

    await client.query('COMMIT');
    await enqueue(order.id, provider, providerOrderId);

    return res.status(201).json({
      orderId:  order.id,
      number:   order.phone_number,
      service:  order.service,
      price:    userPrice,
      provider,
      status:   'waiting',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Buy number failed', { error: err.message });
    return res.status(500).json({ error: err.message || 'Purchase failed' });
  } finally {
    client.release();
  }
}

export async function getSMS(req, res) {
  const { id } = req.query;
  const { rows } = await query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
  const o = rows[0];
  return res.json({ status: o.status, otp: o.otp, number: o.phone_number });
}

export async function cancelNumber(req, res) {
  const { id } = req.body;
  const { rows } = await query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.user.id]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'waiting') {
    return res.status(400).json({ error: 'Order cannot be cancelled' });
  }
  try {
    await cancelOrder(order.provider, order.provider_order_id);
    await dequeue(order.id);
    await query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
      [order.user_price, req.user.id]
    );
    await query(
      `INSERT INTO transactions (user_id, amount, type, reference) VALUES ($1,$2,'refund',$3)`,
      [req.user.id, order.user_price, `Refund ${order.id}`]
    );
    await query('DELETE FROM platform_revenue WHERE order_id = $1', [order.id]);
    await query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [order.id]
    );
    return res.json({ success: true, refunded: order.user_price });
  } catch {
    return res.status(500).json({ error: 'Cancel failed' });
  }
}

export async function getOrders(req, res) {
  const { rows } = await query(
    `SELECT id, service, phone_number, otp, status, user_price, provider, country, created_at
     FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  return res.json(rows);
}

// Called by otpPoller when OTP arrives — sends email to user
export async function notifyOTPReceived(orderId, otp, userEmail, service, number) {
  if (!userEmail || !otp) return;
  try {
    await sendOTPEmail({ to: userEmail, otp, service, number });
    logger.info('OTP email sent', { orderId, email: userEmail });
  } catch (err) {
    logger.warn('OTP email failed', { orderId, error: err.message });
  }
}
