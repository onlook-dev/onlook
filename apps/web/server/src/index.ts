import { editorServerConfig } from '@onlook/web-shared';
import { createServer } from './server';

const server = createServer(editorServerConfig);

void server.start();