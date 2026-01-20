import { Router, IRouter } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: IRouter = Router();
const userController = new UserController();

router.get('/profile', authMiddleware, (req, res, next) => {
  userController.getProfile(req, res).catch(next);
});
router.patch('/profile', authMiddleware, (req, res, next) => {
  userController.updateProfile(req, res).catch(next);
});
router.delete('/profile', authMiddleware, (req, res, next) => {
  userController.deleteAccount(req, res).catch(next);
});

export default router;
