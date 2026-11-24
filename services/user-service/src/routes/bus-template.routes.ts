import { Router, IRouter } from 'express';
import { busTemplateController } from '../controllers/bus-template.controller';

const router: IRouter = Router();

router.get('/', busTemplateController.getBusTemplates);
router.get('/:id', busTemplateController.getBusTemplateById);

export default router;
