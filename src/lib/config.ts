// Configuration file for the FireFetch Dashboard

export const config = {
  // Uptime Kuma Configuration
  uptimeKuma: {
    apiKey: process.env.UPTIME_KUMA_API_KEY || "uk1_-uKYI9ZavqZ0eg82NLTBogjk-qy1uvwwlkEZPFH8",
    baseUrl: process.env.UPTIME_KUMA_URL || "http://localhost:3001",
    publicUrl: "https://status.firefetch.org",
  },

  // Infrastructure paths
  infrastructure: {
    servicesPath: "/home/ubuntu/ai/infrastructure/services.json",
  },

  // Docker Configuration
  docker: {
    socketPath: "/var/run/docker.sock",
  },
} as const;
