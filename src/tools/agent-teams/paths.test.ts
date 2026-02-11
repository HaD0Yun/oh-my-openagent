/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { homedir } from "node:os"
import { join } from "node:path"
import {
  getAgentTeamsRootDir,
  getTeamConfigPath,
  getTeamDir,
  getTeamInboxDir,
  getTeamInboxPath,
  getTeamTaskDir,
  getTeamTaskPath,
  getTeamsRootDir,
  getTeamTasksRootDir,
} from "./paths"

describe("agent-teams paths", () => {
  test("uses user-global .sisyphus directory as storage root", () => {
    //#given
    const expectedRoot = join(homedir(), ".sisyphus", "agent-teams")

    //#when
    const root = getAgentTeamsRootDir()

    //#then
    expect(root).toBe(expectedRoot)
  })

  test("builds expected teams and tasks root directories", () => {
    //#given
    const expectedRoot = join(homedir(), ".sisyphus", "agent-teams")

    //#when
    const teamsRoot = getTeamsRootDir()
    const tasksRoot = getTeamTasksRootDir()

    //#then
    expect(teamsRoot).toBe(join(expectedRoot, "teams"))
    expect(tasksRoot).toBe(join(expectedRoot, "tasks"))
  })

  test("builds team-scoped config, inbox, and task file paths", () => {
    //#given
    const teamName = "alpha_team"
    const agentName = "worker_1"
    const taskId = "T-123"
    const expectedTeamDir = join(getTeamsRootDir(), "alpha_team")

    //#when
    const teamDir = getTeamDir(teamName)
    const configPath = getTeamConfigPath(teamName)
    const inboxDir = getTeamInboxDir(teamName)
    const inboxPath = getTeamInboxPath(teamName, agentName)
    const taskDir = getTeamTaskDir(teamName)
    const taskPath = getTeamTaskPath(teamName, taskId)

    //#then
    expect(teamDir).toBe(expectedTeamDir)
    expect(configPath).toBe(join(expectedTeamDir, "config.json"))
    expect(inboxDir).toBe(join(expectedTeamDir, "inboxes"))
    expect(inboxPath).toBe(join(expectedTeamDir, "inboxes", `${agentName}.json`))
    expect(taskDir).toBe(join(getTeamTasksRootDir(), "alpha_team"))
    expect(taskPath).toBe(join(getTeamTasksRootDir(), "alpha_team", `${taskId}.json`))
  })

  test("sanitizes team names with invalid characters", () => {
    //#given
    const invalidTeamName = "team space/with@special#chars"
    const expectedSanitized = "team-space-with-special-chars"

    //#when
    const teamDir = getTeamDir(invalidTeamName)
    const configPath = getTeamConfigPath(invalidTeamName)
    const taskDir = getTeamTaskDir(invalidTeamName)

    //#then
    expect(teamDir).toBe(join(getTeamsRootDir(), expectedSanitized))
    expect(configPath).toBe(join(getTeamsRootDir(), expectedSanitized, "config.json"))
    expect(taskDir).toBe(join(getTeamTasksRootDir(), expectedSanitized))
  })
})
