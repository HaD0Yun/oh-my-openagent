import { join } from "node:path"
import { homedir } from "node:os"
import { sanitizePathSegment } from "../../features/claude-tasks/storage"

const SISYPHUS_DIR = ".sisyphus"
const AGENT_TEAMS_DIR = "agent-teams"

export function getAgentTeamsRootDir(): string {
  return join(homedir(), SISYPHUS_DIR, AGENT_TEAMS_DIR)
}

export function getTeamsRootDir(): string {
  return join(getAgentTeamsRootDir(), "teams")
}

export function getTeamTasksRootDir(): string {
  return join(getAgentTeamsRootDir(), "tasks")
}

export function getTeamDir(teamName: string): string {
  return join(getTeamsRootDir(), sanitizePathSegment(teamName))
}

export function getTeamConfigPath(teamName: string): string {
  return join(getTeamDir(teamName), "config.json")
}

export function getTeamInboxDir(teamName: string): string {
  return join(getTeamDir(teamName), "inboxes")
}

export function getTeamInboxPath(teamName: string, agentName: string): string {
  return join(getTeamInboxDir(teamName), `${agentName}.json`)
}

export function getTeamTaskDir(teamName: string): string {
  return join(getTeamTasksRootDir(), sanitizePathSegment(teamName))
}

export function getTeamTaskPath(teamName: string, taskId: string): string {
  return join(getTeamTaskDir(teamName), `${taskId}.json`)
}
