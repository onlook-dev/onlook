import agent from './locales/ja/agent.json' with { type: 'json' };
import agentStatus from './locales/ja/agentStatus.json' with { type: 'json' };
import app from './locales/ja/app.json' with { type: 'json' };
import appRun from './locales/ja/appRun.json' with { type: 'json' };
import artifact from './locales/ja/artifact.json' with { type: 'json' };
import astryx from './locales/ja/astryx.json' with { type: 'json' };
import blank from './locales/ja/blank.json' with { type: 'json' };
import canvas from './locales/ja/canvas.json' with { type: 'json' };
import chat from './locales/ja/chat.json' with { type: 'json' };
import cloudUpdate from './locales/ja/cloudUpdate.json' with { type: 'json' };
import code from './locales/ja/code.json' with { type: 'json' };
import codebase from './locales/ja/codebase.json' with { type: 'json' };
import diag from './locales/ja/diag.json' with { type: 'json' };
import errorBoundary from './locales/ja/errorBoundary.json' with { type: 'json' };
import firstRun from './locales/ja/firstRun.json' with { type: 'json' };
import frame from './locales/ja/frame.json' with { type: 'json' };
import github from './locales/ja/github.json' with { type: 'json' };
import gitStatus from './locales/ja/gitStatus.json' with { type: 'json' };
import machine from './locales/ja/machine.json' with { type: 'json' };
import menu from './locales/ja/menu.json' with { type: 'json' };
import notifications from './locales/ja/notifications.json' with { type: 'json' };
import onboarding from './locales/ja/onboarding.json' with { type: 'json' };
import project from './locales/ja/project.json' with { type: 'json' };
import projects from './locales/ja/projects.json' with { type: 'json' };
import projectSetup from './locales/ja/projectSetup.json' with { type: 'json' };
import quit from './locales/ja/quit.json' with { type: 'json' };
import rail from './locales/ja/rail.json' with { type: 'json' };
import report from './locales/ja/report.json' with { type: 'json' };
import reset from './locales/ja/reset.json' with { type: 'json' };
import settings from './locales/ja/settings.json' with { type: 'json' };
import setup from './locales/ja/setup.json' with { type: 'json' };
import sidebar from './locales/ja/sidebar.json' with { type: 'json' };
import tabs from './locales/ja/tabs.json' with { type: 'json' };
import taskManager from './locales/ja/taskManager.json' with { type: 'json' };
import telemetry from './locales/ja/telemetry.json' with { type: 'json' };
import tips from './locales/ja/tips.json' with { type: 'json' };
import topbar from './locales/ja/topbar.json' with { type: 'json' };
import tour from './locales/ja/tour.json' with { type: 'json' };
import update from './locales/ja/update.json' with { type: 'json' };
import workspace from './locales/ja/workspace.json' with { type: 'json' };
import { edition } from './edition/cloud.js';
import type { StringKey } from './strings.js';

export const ja: Readonly<Partial<Record<StringKey, string>>> = {
  ...agent, ...agentStatus, ...app, ...appRun, ...artifact, ...astryx, ...blank, ...canvas, ...chat, ...cloudUpdate, ...code, ...codebase, ...diag, ...errorBoundary, ...firstRun, ...frame, ...github, ...gitStatus, ...machine, ...menu, ...notifications, ...onboarding, ...project, ...projects, ...projectSetup, ...quit, ...rail, ...report, ...reset, ...settings, ...setup, ...sidebar, ...tabs, ...taskManager, ...telemetry, ...tips, ...topbar, ...tour, ...update, ...workspace,
  ...edition.ja,
};
