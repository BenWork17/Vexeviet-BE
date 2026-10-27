import { Router, IRouter } from 'express';
import { AuditLogController } from '../controllers/audit-log.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth.middleware';

const router: IRouter = Router();
const auditLogController = new AuditLogController();

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
