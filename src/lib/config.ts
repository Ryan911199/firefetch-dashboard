// Configuration file for the FireFetch Dashboard

export const config = {
  // Infrastructure paths
  infrastructure: {
    servicesPath: "/home/ubuntu/ai/infrastructure/services.json",
  },

  // Docker Configuration
  docker: {
    socketPath: "/var/run/docker.sock",
  },
} as const;

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  type: 'webapp' | 'automation' | 'infrastructure';
  color: string;
}

export const PROJECTS: Project[] = [
  // Webapps
  {
    id: 'devcommand',
    name: 'DevCommand',
    description: 'Developer project management with AI',
    url: 'https://devcommand.firefetch.org',
    icon: 'Terminal',
    type: 'webapp',
    color: 'blue',
  },
  {
    id: 'candy-inventory',
    name: 'Candy Inventory',
    description: 'Christmas pallet inventory tracker',
    url: 'https://candy.firefetch.org',
    icon: 'Package',
    type: 'webapp',
    color: 'pink',
  },
  {
    id: 'claude-chat',
    name: 'Claude Chat',
    description: 'Web interface for Claude',
    url: 'https://chat.firefetch.org',
    icon: 'MessageSquare',
    type: 'webapp',
    color: 'purple',
  },
  // Automation
  {
    id: 'research',
    name: 'Research',
    description: 'AI-powered research automation',
    url: 'https://research.firefetch.org',
    icon: 'FlaskConical',
    type: 'automation',
    color: 'emerald',
  },
  {
    id: 'dataprocessor',
    name: 'DataProcessor',
    description: 'Email-based data processing',
    url: 'https://dataprocessor.firefetch.org',
    icon: 'Workflow',
    type: 'automation',
    color: 'amber',
  },
  // Infrastructure
  {
    id: 'monitoring',
    name: 'Monitoring',
    description: 'System health dashboard',
    url: '/monitoring',
    icon: 'Activity',
    type: 'infrastructure',
    color: 'cyan',
  },
  {
    id: 'appwrite',
    name: 'Appwrite',
    description: 'Backend console',
    url: 'https://backend.firefetch.org/console',
    icon: 'Database',
    type: 'infrastructure',
    color: 'orange',
  },
];
