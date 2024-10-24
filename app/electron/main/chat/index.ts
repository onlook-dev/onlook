import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import { mainWindow } from '..';
import { GENERATE_CODE_TOOL } from './tool';
import { MainChannels } from '/common/constants';

enum CLAUDE_MODELS {
    SONNET = 'claude-3-5-sonnet-latest',
    HAIKU = 'claude-3-haiku-20240307',
}

class LLMService {
    private static instance: LLMService;
    private anthropic: Anthropic;

    private constructor() {
        this.anthropic = new Anthropic({
            apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        });
    }

    public static getInstance(): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService();
        }
        return LLMService.instance;
    }

    private emitEvent(requestId: string, message: Anthropic.Messages.RawMessageStreamEvent) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_EVENT, {
            requestId,
            message,
        });
    }

    private emitFinalMessage(requestId: string, message: Anthropic.Messages.Message) {
        mainWindow?.webContents.send(MainChannels.CHAT_STREAM_FINAL_MESSAGE, {
            requestId,
            message,
        });
    }

    public async send(messages: MessageParam[]): Promise<Anthropic.Messages.Message> {
        return this.anthropic.messages.create({
            model: CLAUDE_MODELS.SONNET,
            max_tokens: 4096,
            system: 'You are a seasoned React and Tailwind expert.',
            messages,
            tools: [GENERATE_CODE_TOOL],
        });
    }

    public async stream(messages: MessageParam[], requestId: string): Promise<void> {
        const stream = this.anthropic.messages.stream({
            model: CLAUDE_MODELS.SONNET,
            max_tokens: 4096,
            system: 'You are a seasoned React and Tailwind expert.',
            messages,
            tools: [GENERATE_CODE_TOOL],
            stream: true,
        });

        for await (const event of stream) {
            this.emitEvent(requestId, event);
        }

        const finalMessage = await stream.finalMessage();
        this.emitFinalMessage(requestId, finalMessage);
    }
}

export default LLMService.getInstance();

/**
 * 
event {
  type: 'message_start',
  message: {
    id: 'msg_01YYhGfvG6MsXQbxFB84q2aY',
    type: 'message',
    role: 'assistant',
    model: 'claude-3-5-sonnet-20241022',
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 1022, output_tokens: 1 }
  }
}
event {
  type: 'content_block_start',
  index: 0,
  content_block: { type: 'text', text: '' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'I' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: "'ll" }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' help' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' you modify' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' the code to implement' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' a' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' dark mode version' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' of the current' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' design' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: '. I' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: "'ll update" }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' the backgroun' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'd an' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'd text colors to create a' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' dark theme while' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' maintaining the same' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' layout' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' and structure' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: '.' }
}
contentBlock {
  type: 'text',
  text: "I'll help you modify the code to implement a dark mode version of the current design. I'll update the background and text colors to create a dark theme while maintaining the same layout and structure."
}
event { type: 'content_block_stop', index: 0 }
event {
  type: 'content_block_start',
  index: 1,
  content_block: {
    type: 'tool_use',
    id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
    name: 'generate_code',
    input: {}
  }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '{"chang' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'es": [{' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"fileNam' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'e": "/Us' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ers/k' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ietho/workpl' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ace/onlook' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '/tes' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't/test/' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'app/page.tsx' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '", "value": ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"expor' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't defaul' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't funct' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ion Pa' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ge() {\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'n    ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ret' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'urn (\\n ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '       <di' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'v classNa' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'me=\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"w-full m' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'in-h-scre' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'en flex ite' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ms-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'center ju' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'stify' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-center bg-g' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ray-900' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' relative ov' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'erflo' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'w-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'hidden\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '">\\n ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '         <di' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'v classNa' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'me=\\"text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'center text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'white p-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '8 relative' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' z-10\\"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '>\\n         ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '    ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '   <h1 clas' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'sN' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ame=' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '\\"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'text-5xl f' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ont' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-semi' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'bold mb' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-4 ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'tracking-t' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ight\\">\\n  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '       ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '     ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '      Welcom' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'e to' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' you' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'r a' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'pp\\n      ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '          </' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'h1>\\n       ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '      ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' <p c' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'lassName=\\"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'text-2xl tex' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't-gray-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '300 mb' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-8\\">\\n     ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '    ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '       ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  Open thi' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 's page in O' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'nlook to ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'start' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '\\n   ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '            ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' </p>\\n ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '           <' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '/d' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'iv>\\n  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '      </div>' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '\\n' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '    );\\n}\\n"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ', "descripti' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'on":' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' "' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'Updated the ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'color' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' scheme ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'to da' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'rk mod' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'e ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'by:\\n1.' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' Changed b' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ackg' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'round' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' from bg-w' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'hite to ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'bg-gray-90' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '0\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'n2.' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' Ch' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'anged te' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'xt-gray-900' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' to text' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-white fo' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'r better ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'contr' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ast\\n3. Up' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'dated ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'secondary t' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ext color f' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'rom text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'gr' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ay' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-8' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '00 to text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'gray-300' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' for bett' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'er readabili' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ty in da' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'rk mode' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"}]}' }
}
contentBlock {
  type: 'tool_use',
  id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
  name: 'generate_code',
  input: { changes: [ [Object] ] }
}
event { type: 'content_block_stop', index: 1 }
event {
  type: 'message_delta',
  delta: { stop_reason: 'tool_use', stop_sequence: null },
  usage: { output_tokens: 374 }
}
message {
  id: 'msg_01YYhGfvG6MsXQbxFB84q2aY',
  type: 'message',
  role: 'assistant',
  model: 'claude-3-5-sonnet-20241022',
  content: [
    {
      type: 'text',
      text: "I'll help you modify the code to implement a dark mode version of the current design. I'll update the background and text colors to create a dark theme while maintaining the same layout and structure."
    },
    {
      type: 'tool_use',
      id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
      name: 'generate_code',
      input: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: { input_tokens: 1022, output_tokens: 374 }
}
event { type: 'message_stop' }
finalMessage {
  id: 'msg_01YYhGfvG6MsXQbxFB84q2aY',
  type: 'message',
  role: 'assistant',
  model: 'claude-3-5-sonnet-20241022',
  content: [
    {
      type: 'text',
      text: "I'll help you modify the code to implement a dark mode version of the current design. I'll update the background and text colors to create a dark theme while maintaining the same layout and structure."
    },
    {
      type: 'tool_use',
      id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
      name: 'generate_code',
      input: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: { input_tokens: 1022, output_tokens: 374 }
}
 */
