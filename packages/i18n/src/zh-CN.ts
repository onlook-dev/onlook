import agent from './locales/zh-CN/agent.json' with { type: 'json' };
import agentStatus from './locales/zh-CN/agentStatus.json' with { type: 'json' };
import app from './locales/zh-CN/app.json' with { type: 'json' };
import appRun from './locales/zh-CN/appRun.json' with { type: 'json' };
import artifact from './locales/zh-CN/artifact.json' with { type: 'json' };
import astryx from './locales/zh-CN/astryx.json' with { type: 'json' };
import blank from './locales/zh-CN/blank.json' with { type: 'json' };
import canvas from './locales/zh-CN/canvas.json' with { type: 'json' };
import chat from './locales/zh-CN/chat.json' with { type: 'json' };
import cloudUpdate from './locales/zh-CN/cloudUpdate.json' with { type: 'json' };
import code from './locales/zh-CN/code.json' with { type: 'json' };
import codebase from './locales/zh-CN/codebase.json' with { type: 'json' };
import diag from './locales/zh-CN/diag.json' with { type: 'json' };
import errorBoundary from './locales/zh-CN/errorBoundary.json' with { type: 'json' };
import firstRun from './locales/zh-CN/firstRun.json' with { type: 'json' };
import frame from './locales/zh-CN/frame.json' with { type: 'json' };
import github from './locales/zh-CN/github.json' with { type: 'json' };
import gitStatus from './locales/zh-CN/gitStatus.json' with { type: 'json' };
import machine from './locales/zh-CN/machine.json' with { type: 'json' };
import menu from './locales/zh-CN/menu.json' with { type: 'json' };
import notifications from './locales/zh-CN/notifications.json' with { type: 'json' };
import onboarding from './locales/zh-CN/onboarding.json' with { type: 'json' };
import project from './locales/zh-CN/project.json' with { type: 'json' };
import projects from './locales/zh-CN/projects.json' with { type: 'json' };
import projectSetup from './locales/zh-CN/projectSetup.json' with { type: 'json' };
import quit from './locales/zh-CN/quit.json' with { type: 'json' };
import rail from './locales/zh-CN/rail.json' with { type: 'json' };
import report from './locales/zh-CN/report.json' with { type: 'json' };
import reset from './locales/zh-CN/reset.json' with { type: 'json' };
import settings from './locales/zh-CN/settings.json' with { type: 'json' };
import setup from './locales/zh-CN/setup.json' with { type: 'json' };
import sidebar from './locales/zh-CN/sidebar.json' with { type: 'json' };
import tabs from './locales/zh-CN/tabs.json' with { type: 'json' };
import taskManager from './locales/zh-CN/taskManager.json' with { type: 'json' };
import telemetry from './locales/zh-CN/telemetry.json' with { type: 'json' };
import tips from './locales/zh-CN/tips.json' with { type: 'json' };
import topbar from './locales/zh-CN/topbar.json' with { type: 'json' };
import tour from './locales/zh-CN/tour.json' with { type: 'json' };
import update from './locales/zh-CN/update.json' with { type: 'json' };
import workspace from './locales/zh-CN/workspace.json' with { type: 'json' };
import { edition } from './edition/cloud.js';
import type { StringKey } from './strings.js';

export const zhCN: Readonly<Partial<Record<StringKey, string>>> = {
  ...agent, ...agentStatus, ...app, ...appRun, ...artifact, ...astryx, ...blank, ...canvas, ...chat, ...cloudUpdate, ...code, ...codebase, ...diag, ...errorBoundary, ...firstRun, ...frame, ...github, ...gitStatus, ...machine, ...menu, ...notifications, ...onboarding, ...project, ...projects, ...projectSetup, ...quit, ...rail, ...report, ...reset, ...settings, ...setup, ...sidebar, ...tabs, ...taskManager, ...telemetry, ...tips, ...topbar, ...tour, ...update, ...workspace,
  ...edition['zh-CN'],
};
