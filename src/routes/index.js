import { Router } from 'express';
import express from 'express';

import {
  register, login, getMe, regenerateKey,
  verifyDevice, getMyDevices, revokeDevice,
  forgotPassword, resetPassword, validateResetToken,
} from '../controllers/authController.js';
import { listServices, buyNumber, getSMS, cancelNumber, getOrders } from '../controllers/orderController.js';
import { getBalance, getTransactions, getCurrencies, createDeposit, depositStatus, webhook } from '../controllers/walletController.js';
import { getStats, getDailyRevenue, setMarkup, getProviders, toggleProvider, getUsers, toggleUser, blockIp, getAllOrders, withdraw, getWithdrawals } from '../controllers/adminController.js';
import { createTicket, getMyTickets, getTicketMessages, replyToTicket, closeMyTicket, adminGetAllTickets, adminGetTicketMessages, adminReplyTicket, adminSetTicketStatus, adminUnreadCount } from '../controllers/supportController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { authLimiter, buyLimiter, forgotPasswordLimiter } from '../middleware/rateLimit.js';

const router = Router();

// ── Public ────────────────────────────────────────────────────
router.post('/auth/register',    authLimiter, register);
router.post('/auth/login',       authLimiter, login);
router.post('/auth/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/auth/reset-password',  authLimiter, resetPassword);
router.get('/auth/validate-reset/:token', validateResetToken);
router.get('/auth/verify-device/:token',  verifyDevice);
router.get('/services', listServices);

router.post(
  '/wallet/webhook',
  express.raw({ type: '*/*' }),
  (req, res, next) => { try { req.body = JSON.parse(req.body); } catch {} next(); },
  webhook,
);

// ── Authenticated ─────────────────────────────────────────────
router.use(requireAuth);

router.get('/me',                  getMe);
router.post('/me/regenerate-key',  regenerateKey);
router.get('/me/devices',          getMyDevices);
router.delete('/me/devices/:deviceId', revokeDevice);

router.get('/wallet/balance',             getBalance);
router.get('/wallet/transactions',        getTransactions);
router.get('/wallet/currencies',          getCurrencies);
router.post('/wallet/deposit',            createDeposit);
router.get('/wallet/deposit/:id/status',  depositStatus);

router.post('/orders/buy',    buyLimiter, buyNumber);
router.get('/orders/sms',     getSMS);
router.post('/orders/cancel', cancelNumber);
router.get('/orders',         getOrders);

router.post('/support/tickets',             createTicket);
router.get('/support/tickets',              getMyTickets);
router.get('/support/tickets/:id',          getTicketMessages);
router.post('/support/tickets/:id/reply',   replyToTicket);
router.post('/support/tickets/:id/close',   closeMyTicket);

// ── Admin ─────────────────────────────────────────────────────
router.use('/admin', requireAdmin);

router.get('/admin/stats',              getStats);
router.get('/admin/revenue/daily',      getDailyRevenue);
router.post('/admin/markup',            setMarkup);
router.get('/admin/providers',          getProviders);
router.post('/admin/providers/toggle',  toggleProvider);
router.get('/admin/users',              getUsers);
router.post('/admin/users/toggle',      toggleUser);
router.post('/admin/block-ip',          blockIp);
router.get('/admin/orders',             getAllOrders);
router.post('/admin/withdraw',          withdraw);
router.get('/admin/withdrawals',        getWithdrawals);

router.get('/admin/support/tickets',              adminGetAllTickets);
router.get('/admin/support/tickets/:id',          adminGetTicketMessages);
router.post('/admin/support/tickets/:id/reply',   adminReplyTicket);
router.post('/admin/support/tickets/:id/status',  adminSetTicketStatus);
router.get('/admin/support/unread',               adminUnreadCount);

export default router;
