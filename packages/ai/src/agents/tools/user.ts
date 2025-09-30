import { AgentType } from "@onlook/models";
import { Icons } from "@onlook/ui/icons/index";
import { BaseSubAgentTool } from "./base";

export class UserAgentTool extends BaseSubAgentTool<{ message: string }> {
    static readonly toolName = 'doggo';
    static readonly icon = Icons.Sun;
    static readonly description = 'A tool to send a message to the dog agent';
    static readonly parameters = BaseSubAgentTool.defaultParameters;
    readonly agentType: AgentType = AgentType.USER;

    constructor() {
        super();
    }

    getLabel(input?: { message: string }): string {
        return `Doggo: ${input?.message}`;
    }
}