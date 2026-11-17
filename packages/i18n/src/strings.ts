import agent from './locales/en/agent.json' with { type: 'json' };
import agentStatus from './locales/en/agentStatus.json' with { type: 'json' };
import app from './locales/en/app.json' with { type: 'json' };
import appRun from './locales/en/appRun.json' with { type: 'json' };
import artifact from './locales/en/artifact.json' with { type: 'json' };
import astryx from './locales/en/astryx.json' with { type: 'json' };
import blank from './locales/en/blank.json' with { type: 'json' };
import canvas from './locales/en/canvas.json' with { type: 'json' };
import chat from './locales/en/chat.json' with { type: 'json' };
import cloudUpdate from './locales/en/cloudUpdate.json' with { type: 'json' };
import code from './locales/en/code.json' with { type: 'json' };
import codebase from './locales/en/codebase.json' with { type: 'json' };
import diag from './locales/en/diag.json' with { type: 'json' };
import errorBoundary from './locales/en/errorBoundary.json' with { type: 'json' };
import firstRun from './locales/en/firstRun.json' with { type: 'json' };
import frame from './locales/en/frame.json' with { type: 'json' };
import github from './locales/en/github.json' with { type: 'json' };
import gitStatus from './locales/en/gitStatus.json' with { type: 'json' };
import machine from './locales/en/machine.json' with { type: 'json' };
import menu from './locales/en/menu.json' with { type: 'json' };
import notifications from './locales/en/notifications.json' with { type: 'json' };
import onboarding from './locales/en/onboarding.json' with { type: 'json' };
import project from './locales/en/project.json' with { type: 'json' };
import projects from './locales/en/projects.json' with { type: 'json' };
import projectSetup from './locales/en/projectSetup.json' with { type: 'json' };
import quit from './locales/en/quit.json' with { type: 'json' };
import rail from './locales/en/rail.json' with { type: 'json' };
import report from './locales/en/report.json' with { type: 'json' };
import reset from './locales/en/reset.json' with { type: 'json' };
import settings from './locales/en/settings.json' with { type: 'json' };
import setup from './locales/en/setup.json' with { type: 'json' };
import sidebar from './locales/en/sidebar.json' with { type: 'json' };
import tabs from './locales/en/tabs.json' with { type: 'json' };
import taskManager from './locales/en/taskManager.json' with { type: 'json' };
import telemetry from './locales/en/telemetry.json' with { type: 'json' };
import tips from './locales/en/tips.json' with { type: 'json' };
import topbar from './locales/en/topbar.json' with { type: 'json' };
import tour from './locales/en/tour.json' with { type: 'json' };
import update from './locales/en/update.json' with { type: 'json' };
import workspace from './locales/en/workspace.json' with { type: 'json' };
import { edition, type EditionKey } from './edition/cloud.js';

const shared = { ...agent, ...agentStatus, ...app, ...appRun, ...artifact, ...astryx, ...blank, ...canvas, ...chat, ...cloudUpdate, ...code, ...codebase, ...diag, ...errorBoundary, ...firstRun, ...frame, ...github, ...gitStatus, ...machine, ...menu, ...notifications, ...onboarding, ...project, ...projects, ...projectSetup, ...quit, ...rail, ...report, ...reset, ...settings, ...setup, ...sidebar, ...tabs, ...taskManager, ...telemetry, ...tips, ...topbar, ...tour, ...update, ...workspace };

export type StringKey = keyof typeof shared | EditionKey;

export const en: Readonly<Record<keyof typeof shared, string> & Partial<Record<EditionKey, string>>> = {
  ...shared,
  ...edition.en,
  ...edition.brand,
};

export type StringParams = Record<string, string | number>;
