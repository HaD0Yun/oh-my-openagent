import { describe, it, expect } from "bun:test"
import { z } from "zod"
import {
  TeamConfigSchema,
  TeamMemberSchema,
  TeamTeammateMemberSchema,
  MessageTypeSchema,
  InboxMessageSchema,
  TeamTaskSchema,
  TeamCreateInputSchema,
  TeamDeleteInputSchema,
  SendMessageInputSchema,
  ReadInboxInputSchema,
  ReadConfigInputSchema,
  TeamSpawnInputSchema,
  ForceKillTeammateInputSchema,
  ProcessShutdownApprovedInputSchema,
} from "./types"

describe("TeamConfigSchema", () => {
  it("validates a complete team config", () => {
    // given
    const validConfig = {
      name: "my-team",
      description: "A test team",
      createdAt: "2026-02-11T10:00:00Z",
      leadAgentId: "agent-123",
      leadSessionId: "ses-456",
      members: [
        {
          agentId: "agent-123",
          name: "Lead Agent",
          agentType: "lead",
          color: "blue",
        },
        {
          agentId: "agent-789",
          name: "Worker 1",
          agentType: "teammate",
          color: "green",
          category: "quick",
          model: "claude-sonnet-4-5",
          prompt: "You are a helpful assistant",
          planModeRequired: false,
          joinedAt: "2026-02-11T10:05:00Z",
          cwd: "/tmp",
          subscriptions: ["task-updates"],
          backendType: "native" as const,
          isActive: true,
          sessionID: "ses-789",
          backgroundTaskID: "task-123",
        },
      ],
    }

    // when
    const result = TeamConfigSchema.safeParse(validConfig)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid team config", () => {
    // given
    const invalidConfig = {
      name: "",
      description: "A test team",
      createdAt: "invalid-date",
      leadAgentId: "",
      leadSessionId: "ses-456",
      members: [],
    }

    // when
    const result = TeamConfigSchema.safeParse(invalidConfig)

    // then
    expect(result.success).toBe(false)
  })
})

describe("TeamMemberSchema", () => {
  it("validates a lead member", () => {
    // given
    const leadMember = {
      agentId: "agent-123",
      name: "Lead Agent",
      agentType: "lead",
      color: "blue",
    }

    // when
    const result = TeamMemberSchema.safeParse(leadMember)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid member", () => {
    // given
    const invalidMember = {
      agentId: "",
      name: "",
      agentType: "invalid",
      color: "invalid",
    }

    // when
    const result = TeamMemberSchema.safeParse(invalidMember)

    // then
    expect(result.success).toBe(false)
  })
})

describe("TeamTeammateMemberSchema", () => {
  it("validates a complete teammate member", () => {
    // given
    const teammateMember = {
      agentId: "agent-789",
      name: "Worker 1",
      agentType: "teammate",
      color: "green",
      category: "quick",
      model: "claude-sonnet-4-5",
      prompt: "You are a helpful assistant",
      planModeRequired: false,
      joinedAt: "2026-02-11T10:05:00Z",
      cwd: "/tmp",
      subscriptions: ["task-updates"],
      backendType: "native" as const,
      isActive: true,
      sessionID: "ses-789",
      backgroundTaskID: "task-123",
    }

    // when
    const result = TeamTeammateMemberSchema.safeParse(teammateMember)

    // then
    expect(result.success).toBe(true)
  })

  it("validates teammate member with optional fields missing", () => {
    // given
    const minimalTeammate = {
      agentId: "agent-789",
      name: "Worker 1",
      agentType: "teammate",
      color: "green",
      category: "quick",
      model: "claude-sonnet-4-5",
      prompt: "You are a helpful assistant",
      planModeRequired: false,
      joinedAt: "2026-02-11T10:05:00Z",
      cwd: "/tmp",
      subscriptions: [],
      backendType: "native" as const,
      isActive: true,
    }

    // when
    const result = TeamTeammateMemberSchema.safeParse(minimalTeammate)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid teammate member", () => {
    // given
    const invalidTeammate = {
      agentId: "",
      name: "Worker 1",
      agentType: "teammate",
      color: "green",
      category: "quick",
      model: "claude-sonnet-4-5",
      prompt: "You are a helpful assistant",
      planModeRequired: false,
      joinedAt: "invalid-date",
      cwd: "/tmp",
      subscriptions: [],
      backendType: "invalid" as const,
      isActive: true,
    }

    // when
    const result = TeamTeammateMemberSchema.safeParse(invalidTeammate)

    // then
    expect(result.success).toBe(false)
  })

  it("rejects reserved agentType for teammate schema", () => {
    // given
    const invalidTeammate = {
      agentId: "worker@team",
      name: "worker",
      agentType: "team-lead",
      category: "quick",
      model: "native",
      prompt: "do work",
      color: "blue",
      planModeRequired: false,
      joinedAt: "2026-02-11T10:05:00Z",
      cwd: "/tmp",
      subscriptions: [],
      backendType: "native",
      isActive: false,
    }

    // when
    const result = TeamTeammateMemberSchema.safeParse(invalidTeammate)

    // then
    expect(result.success).toBe(false)
  })
})

describe("MessageTypeSchema", () => {
  it("validates all 5 message types", () => {
    // given
    const types = ["message", "broadcast", "shutdown_request", "shutdown_response", "plan_approval_response"]

    // when & then
    types.forEach(type => {
      const result = MessageTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
      expect(result.data).toBe(type)
    })
  })

  it("rejects invalid message type", () => {
    // given
    const invalidType = "invalid_type"

    // when
    const result = MessageTypeSchema.safeParse(invalidType)

    // then
    expect(result.success).toBe(false)
  })
})

describe("InboxMessageSchema", () => {
  it("validates a complete inbox message", () => {
    // given
    const message = {
      id: "msg-123",
      type: "message" as const,
      sender: "agent-123",
      recipient: "agent-456",
      content: "Hello world",
      summary: "Greeting",
      timestamp: "2026-02-11T10:00:00Z",
      read: false,
      requestId: "req-123",
      approve: true,
    }

    // when
    const result = InboxMessageSchema.safeParse(message)

    // then
    expect(result.success).toBe(true)
  })

  it("validates message with optional fields missing", () => {
    // given
    const minimalMessage = {
      id: "msg-123",
      type: "broadcast" as const,
      sender: "agent-123",
      recipient: "agent-456",
      content: "Hello world",
      summary: "Greeting",
      timestamp: "2026-02-11T10:00:00Z",
      read: false,
    }

    // when
    const result = InboxMessageSchema.safeParse(minimalMessage)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid inbox message", () => {
    // given
    const invalidMessage = {
      id: "",
      type: "invalid" as const,
      sender: "",
      recipient: "",
      content: "",
      summary: "",
      timestamp: "invalid-date",
      read: "not-boolean",
    }

    // when
    const result = InboxMessageSchema.safeParse(invalidMessage)

    // then
    expect(result.success).toBe(false)
  })
})

describe("TeamTaskSchema", () => {
  it("validates a task object", () => {
    // given
    const task = {
      id: "T-12345678-1234-1234-1234-123456789012",
      subject: "Implement feature",
      description: "Add new functionality",
      status: "pending" as const,
      activeForm: "Implementing feature",
      blocks: [],
      blockedBy: [],
      owner: "agent-123",
      metadata: { priority: "high" },
      repoURL: "https://github.com/user/repo",
      parentID: "T-parent",
      threadID: "thread-123",
    }

    // when
    const result = TeamTaskSchema.safeParse(task)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid task", () => {
    // given
    const invalidTask = {
      id: "invalid-id",
      subject: "",
      description: "Add new functionality",
      status: "invalid" as const,
      activeForm: "Implementing feature",
      blocks: [],
      blockedBy: [],
    }

    // when
    const result = TeamTaskSchema.safeParse(invalidTask)

    // then
    expect(result.success).toBe(false)
  })
})

describe("TeamCreateInputSchema", () => {
  it("validates create input with description", () => {
    // given
    const input = {
      team_name: "my-team",
      description: "A test team",
    }

    // when
    const result = TeamCreateInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("validates create input without description", () => {
    // given
    const input = {
      team_name: "my-team",
    }

    // when
    const result = TeamCreateInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid create input", () => {
    // given
    const input = {
      team_name: "invalid team name with spaces and special chars!",
    }

    // when
    const result = TeamCreateInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})

describe("TeamDeleteInputSchema", () => {
  it("validates delete input", () => {
    // given
    const input = {
      team_name: "my-team",
    }

    // when
    const result = TeamDeleteInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid delete input", () => {
    // given
    const input = {
      team_name: "",
    }

    // when
    const result = TeamDeleteInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})

describe("SendMessageInputSchema", () => {
  it("validates message type input", () => {
    // given
    const input = {
      team_name: "my-team",
      type: "message" as const,
      recipient: "agent-456",
      content: "Hello world",
      summary: "Greeting",
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("validates broadcast type input", () => {
    // given
    const input = {
      team_name: "my-team",
      type: "broadcast" as const,
      content: "Team announcement",
      summary: "Announcement",
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("validates shutdown_request type input", () => {
    // given
    const input = {
      team_name: "my-team",
      type: "shutdown_request" as const,
      recipient: "agent-456",
      content: "Please shutdown",
      summary: "Shutdown request",
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("validates shutdown_response type input", () => {
    // given
    const input = {
      team_name: "my-team",
      type: "shutdown_response" as const,
      request_id: "req-123",
      approve: true,
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("validates plan_approval_response type input", () => {
    // given
    const input = {
      team_name: "my-team",
      type: "plan_approval_response" as const,
      request_id: "req-456",
      approve: false,
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects message type without recipient", () => {
    // given
    const input = {
      team_name: "my-team",
      type: "message" as const,
      content: "Hello world",
      summary: "Greeting",
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })

  it("rejects shutdown_response without request_id", () => {
    // given
    const input = {
      team_name: "my-team",
      type: "shutdown_response" as const,
      approve: true,
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })

  it("rejects invalid team_name", () => {
    // given
    const input = {
      team_name: "invalid team name",
      type: "broadcast" as const,
      content: "Hello",
      summary: "Greeting",
    }

    // when
    const result = SendMessageInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})

describe("ReadInboxInputSchema", () => {
  it("validates read inbox input", () => {
    // given
    const input = {
      team_name: "my-team",
      agent_name: "worker-1",
      unread_only: true,
      mark_as_read: false,
    }

    // when
    const result = ReadInboxInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("validates minimal read inbox input", () => {
    // given
    const input = {
      team_name: "my-team",
      agent_name: "worker-1",
    }

    // when
    const result = ReadInboxInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid read inbox input", () => {
    // given
    const input = {
      team_name: "",
      agent_name: "",
    }

    // when
    const result = ReadInboxInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})

describe("ReadConfigInputSchema", () => {
  it("validates read config input", () => {
    // given
    const input = {
      team_name: "my-team",
    }

    // when
    const result = ReadConfigInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid read config input", () => {
    // given
    const input = {
      team_name: "",
    }

    // when
    const result = ReadConfigInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})

describe("TeamSpawnInputSchema", () => {
  it("validates spawn input", () => {
    // given
    const input = {
      team_name: "my-team",
      name: "worker-1",
      category: "quick",
      prompt: "You are a helpful assistant",
    }

    // when
    const result = TeamSpawnInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid spawn input", () => {
    // given
    const input = {
      team_name: "invalid team",
      name: "",
      category: "quick",
      prompt: "You are a helpful assistant",
    }

    // when
    const result = TeamSpawnInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})

describe("ForceKillTeammateInputSchema", () => {
  it("validates force kill input", () => {
    // given
    const input = {
      team_name: "my-team",
      teammate_name: "worker-1",
    }

    // when
    const result = ForceKillTeammateInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid force kill input", () => {
    // given
    const input = {
      team_name: "",
      teammate_name: "",
    }

    // when
    const result = ForceKillTeammateInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})

describe("ProcessShutdownApprovedInputSchema", () => {
  it("validates shutdown approved input", () => {
    // given
    const input = {
      team_name: "my-team",
      teammate_name: "worker-1",
    }

    // when
    const result = ProcessShutdownApprovedInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(true)
  })

  it("rejects invalid shutdown approved input", () => {
    // given
    const input = {
      team_name: "",
      teammate_name: "",
    }

    // when
    const result = ProcessShutdownApprovedInputSchema.safeParse(input)

    // then
    expect(result.success).toBe(false)
  })
})
