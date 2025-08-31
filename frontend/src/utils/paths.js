import { API_BASE } from "./constants";

function applyOptions(path, options = {}) {
  let updatedPath = path;
  if (!options || Object.keys(options).length === 0) return updatedPath;

  if (options.search) {
    const searchParams = new URLSearchParams(options.search);
    updatedPath += `?${searchParams.toString()}`;
  }
  return updatedPath;
}

export default {
  home: () => {
    return "/";
  },
  login: (noTry = false) => {
    return `/login${noTry ? "?nt=1" : ""}`;
  },
  sso: {
    login: () => {
      return "/sso/simple";
    },
  },
  onboarding: {
    home: () => {
      return "/onboarding";
    },
    survey: () => {
      return "/onboarding/survey";
    },
    llmPreference: () => {
      return "/onboarding/llm-preference";
    },
    embeddingPreference: () => {
      return "/onboarding/embedding-preference";
    },
    vectorDatabase: () => {
      return "/onboarding/vector-database";
    },
    userSetup: () => {
      return "/onboarding/user-setup";
    },
    dataHandling: () => {
      return "/onboarding/data-handling";
    },
    createWorkspace: () => {
      return "/onboarding/create-workspace";
    },
  },
  github: () => {
    return "https://github.com/Dimatic-Labs/codex";
  },
  discord: () => {
    return "https://discord.com/invite/6UyHPeGZAC";
  },
  docs: () => {
    return "https://docs.codex.com";
  },
  chatModes: () => {
    return "https://docs.codex.com/features/chat-modes";
  },
  mailToDimatic: () => {
    return "mailto:team@dimatic.com";
  },
  hosting: () => {
    return "https://my.dimatic.com/aio-checkout?product=codex";
  },
  workspace: {
    chat: (slug, options = {}) => {
      return applyOptions(`/workspace/${slug}`, options);
    },
    settings: {
      generalAppearance: (slug) => {
        return `/workspace/${slug}/settings/general-appearance`;
      },
      chatSettings: function (slug, options = {}) {
        return applyOptions(
          `/workspace/${slug}/settings/chat-settings`,
          options
        );
      },
      vectorDatabase: (slug) => {
        return `/workspace/${slug}/settings/vector-database`;
      },
      members: (slug) => {
        return `/workspace/${slug}/settings/members`;
      },
      agentConfig: (slug) => {
        return `/workspace/${slug}/settings/agent-config`;
      },
    },
    thread: (wsSlug, threadSlug) => {
      return `/workspace/${wsSlug}/t/${threadSlug}`;
    },
  },
  apiDocs: () => {
    return `${API_BASE}/docs`;
  },
  settings: {
    users: () => {
      return `/settings/users`;
    },
    invites: () => {
      return `/settings/invites`;
    },
    workspaces: () => {
      return `/settings/workspaces`;
    },
    chats: () => {
      return "/settings/workspace-chats";
    },
    llmPreference: () => {
      return "/settings/llm-preference";
    },
    transcriptionPreference: () => {
      return "/settings/transcription-preference";
    },
    audioPreference: () => {
      return "/settings/audio-preference";
    },
    embedder: {
      modelPreference: () => "/settings/embedding-preference",
      chunkingPreference: () => "/settings/text-splitter-preference",
    },
    embeddingPreference: () => {
      return "/settings/embedding-preference";
    },
    vectorDatabase: () => {
      return "/settings/vector-database";
    },
    security: () => {
      return "/settings/security";
    },
    interface: () => {
      return "/settings/interface";
    },
    branding: () => {
      return "/settings/branding";
    },
    agentSkills: () => {
      return "/settings/agents";
    },
    chat: () => {
      return "/settings/chat";
    },
    apiKeys: () => {
      return "/settings/api-keys";
    },
    systemPromptVariables: () => "/settings/system-prompt-variables",
    logs: () => {
      return "/settings/event-logs";
    },
    privacy: () => {
      return "/settings/privacy";
    },
    embedChatWidgets: () => {
      return `/settings/embed-chat-widgets`;
    },
    browserExtension: () => {
      return `/settings/browser-extension`;
    },
    experimental: () => {
      return `/settings/beta-features`;
    },
    mobileConnections: () => {
      return `/settings/mobile-connections`;
    },
  },
  agents: {
    builder: () => {
      return `/settings/agents/builder`;
    },
    editAgent: (uuid) => {
      return `/settings/agents/builder/${uuid}`;
    },
  },

  // TODO: Migrate all docs.codex.com links to the new docs.
  documentation: {
    mobileIntroduction: () => {
      return "https://docs.codex.com/mobile/overview";
    },
    contextWindows: () => {
      return "https://docs.codex.com/chatting-with-documents/introduction#you-exceed-the-context-window---what-now";
    },
  },

  experimental: {
    liveDocumentSync: {
      manage: () => `/settings/beta-features/live-document-sync/manage`,
    },
  },
};
