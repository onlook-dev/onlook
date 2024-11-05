import { motion } from 'framer-motion';
import Canvas from './Canvas';
import EditPanel from './EditPanel';
import LayersPanel from './LayersPanel';
import ResizablePanel from './LayersPanel/ResizablePanel';
import Toolbar from './Toolbar';
import EditorTopBar from './TopBar';
import WebviewArea from './WebviewArea';

function ProjectEditor() {
    return (
        <>
            <div className="relative flex flex-row h-[calc(100vh-2.5rem)] select-none">
                <Canvas>
                    <WebviewArea />
                </Canvas>
                <ResizablePanel>
                    <motion.div
                        key={'layerspanel'}
                        className="left-0 animate-layer-panel-in"
                        exit={{
                            translateX: '-100%',
                        }}
                        transition={{
                            duration: 1,
                        }}
                    >
                        <LayersPanel />
                    </motion.div>
                </ResizablePanel>
                <motion.div
                    key={'editpanel'}
                    className="fixed right-0 top-20 animate-edit-panel-in"
                    exit={{
                        translateX: '15rem',
                    }}
                    transition={{
                        duration: 1,
                    }}
                >
                    <EditPanel />
                </motion.div>
                <motion.div
                    key={'toolbar'}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-toolbar-up"
                    initial={{
                        position: 'absolute',
                        bottom: '1rem',
                        left: '50%',
                        translateX: '-50%',
                    }}
                    exit={{
                        translateY: '15rem',
                    }}
                    transition={{
                        duration: 1,
                    }}
                >
                    <Toolbar />
                </motion.div>
                <motion.div
                    key={'editortopbar'}
                    className="absolute top-0 w-full z-0"
                    exit={{
                        y: -40,
                        opacity: 0,
                    }}
                    transition={{
                        duration: 1,
                    }}
                >
                    <EditorTopBar />
                </motion.div>
            </div>
        </>
    );
}

export default ProjectEditor;
