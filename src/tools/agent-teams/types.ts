import { z } from "zod"
import { TaskObjectSchema } from "../task/types"

// Team member schemas
export const TeamMemberSchema = z.object({
  agentId: z.string().min(1),
  name: z.string().min(1),
  agentType: z.enum(["lead", "teammate"]),
  color: z.string().min(1),
})

export type TeamMember = z.infer<typeof TeamMemberSchema>

export const TeamTeammateMemberSchema = TeamMemberSchema.extend({
  category: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(1),
  planModeRequired: z.boolean(),
  joinedAt: z.string().datetime(),
  cwd: z.string().min(1),
  subscriptions: z.array(z.string()),
  backendType: z.literal("native"),
  isActive: z.boolean(),
  sessionID: z.string().optional(),
  backgroundTaskID: z.string().optional(),
}).refine(
  (data) => data.agentType === "teammate",
  "TeamTeammateMemberSchema requires agentType to be 'teammate'"
).refine(
  (data) => data.agentType !== "team-lead",
  "agentType 'team-lead' is reserved and not allowed"
)

export type TeamTeammateMember = z.infer<typeof TeamTeammateMemberSchema>

// Team config schema
export const TeamConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  leadAgentId: z.string().min(1),
  leadSessionId: z.string().min(1),
  members: z.array(z.union([TeamMemberSchema, TeamTeammateMemberSchema])),
})

export type TeamConfig = z.infer<typeof TeamConfigSchema>

// Message schemas
export const MessageTypeSchema = z.enum([
  "message",
  "broadcast",
  "shutdown_request",
  "shutdown_response",
  "plan_approval_response",
])

export type MessageType = z.infer<typeof MessageTypeSchema>

export const InboxMessageSchema = z.object({
  id: z.string().min(1),
  type: MessageTypeSchema,
  sender: z.string().min(1),
  recipient: z.string().min(1),
  content: z.string().optional(),
  summary: z.string().optional(),
  timestamp: z.string().datetime(),
  read: z.boolean(),
  requestId: z.string().optional(),
  approve: z.boolean().optional(),
})

export type InboxMessage = z.infer<typeof InboxMessageSchema>

// Task schema (reuse from task/types.ts)
export const TeamTaskSchema = TaskObjectSchema

export type TeamTask = z.infer<typeof TeamTaskSchema>

// Input schemas for tools
export const TeamCreateInputSchema = z.object({
  team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
  description: z.string().optional(),
})

export type TeamCreateInput = z.infer<typeof TeamCreateInputSchema>

export const TeamDeleteInputSchema = z.object({
  team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
})

export type TeamDeleteInput = z.infer<typeof TeamDeleteInputSchema>

export const SendMessageInputSchema = z.discriminatedUnion("type", [
  z.object({
    team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
    type: z.literal("message"),
    recipient: z.string().min(1),
    content: z.string().optional(),
    summary: z.string().optional(),
  }),
  z.object({
    team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
    type: z.literal("broadcast"),
    content: z.string().optional(),
    summary: z.string().optional(),
  }),
  z.object({
    team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
    type: z.literal("shutdown_request"),
    recipient: z.string().min(1),
    content: z.string().optional(),
    summary: z.string().optional(),
  }),
  z.object({
    team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
    type: z.literal("shutdown_response"),
    request_id: z.string().min(1),
    approve: z.boolean(),
  }),
  z.object({
    team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
    type: z.literal("plan_approval_response"),
    request_id: z.string().min(1),
    approve: z.boolean(),
  }),
])

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>

export const ReadInboxInputSchema = z.object({
  team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
  agent_name: z.string().min(1),
  unread_only: z.boolean().optional(),
  mark_as_read: z.boolean().optional(),
})

export type ReadInboxInput = z.infer<typeof ReadInboxInputSchema>

export const ReadConfigInputSchema = z.object({
  team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
})

export type ReadConfigInput = z.infer<typeof ReadConfigInputSchema>

export const TeamSpawnInputSchema = z.object({
  team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
  name: z.string().min(1),
  category: z.string().min(1),
  prompt: z.string().min(1),
})

export type TeamSpawnInput = z.infer<typeof TeamSpawnInputSchema>

export const ForceKillTeammateInputSchema = z.object({
  team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
  teammate_name: z.string().min(1),
})

export type ForceKillTeammateInput = z.infer<typeof ForceKillTeammateInputSchema>

export const ProcessShutdownApprovedInputSchema = z.object({
  team_name: z.string().regex(/^[A-Za-z0-9_-]+$/, "Team name must contain only letters, numbers, hyphens, and underscores").max(64),
  teammate_name: z.string().min(1),
})

export type ProcessShutdownApprovedInput = z.infer<typeof ProcessShutdownApprovedInputSchema>
