import { Router } from 'express';
import proxyRouter from './proxy';

const apiRouter = Router();

apiRouter.use('/proxy', proxyRouter);

export default apiRouter;
