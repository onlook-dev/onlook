import { editorServerConfig } from '@onlook/rpc';
import { createServer } from './server';

const server = createServer(editorServerConfig);

void server.start();