import { Router, IRouter } from 'express';
import { AuditLogController } from '../controllers/audit-log.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth.middleware';

const router: IRouter = Router();
const auditLogController = new AuditLogController();

/**
 * @route   GET /api/v1/audit-logs/export
 * @desc    CSV download of the audit log (same filters as the list)
 * @query   actor, severity, action, target, from, to (page/limit ignored)
 * @access  ADMIN
 *
 * Registered before `GET /` — neither path is parameterised, so ordering is not
 * load-bearing today, but the literal stays ahead of anything id-shaped that
 * might be added later.
 */
router.get('/export', authMiddleware, adminOnly, (req, res, next) => {
  auditLogController.exportAuditLogs(req, res).catch(next);
});

/**
 * @route   GET /api/v1/audit-logs
 * @desc    Paginated admin audit log
 * @query   actor, severity, action, target, from, to, page, limit
 * @access  ADMIN
 */
router.get('/', authMiddleware, adminOnly, (req, res, next) => {
  auditLogController.listAuditLogs(req, res).catch(next);
});

export default router;
