"use client";

import {
  Terminal,
  Package,
  MessageSquare,
  FlaskConical,
  Workflow,
  Activity,
  HeartPulse,
  Database,
  Globe,
  ExternalLink,
  LucideIcon,
} from "lucide-react";

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  type: "webapp" | "automation" | "infrastructure";
  color: string;
}

const iconMap: Record<string, LucideIcon> = {
  Terminal,
  Package,
  MessageSquare,
  FlaskConical,
  Workflow,
  Activity,
  HeartPulse,
  Database,
  Globe,
};

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  blue: {
    bg: "from-blue-500/20 to-indigo-500/20",
    border: "hover:border-blue-500/50",
    text: "text-blue-400",
  },
  pink: {
    bg: "from-pink-500/20 to-rose-500/20",
    border: "hover:border-pink-500/50",
    text: "text-pink-400",
  },
  purple: {
    bg: "from-purple-500/20 to-violet-500/20",
    border: "hover:border-purple-500/50",
    text: "text-purple-400",
  },
  emerald: {
    bg: "from-emerald-500/20 to-teal-500/20",
    border: "hover:border-emerald-500/50",
    text: "text-emerald-400",
  },
  amber: {
    bg: "from-amber-500/20 to-orange-500/20",
    border: "hover:border-amber-500/50",
    text: "text-amber-400",
  },
  cyan: {
    bg: "from-cyan-500/20 to-sky-500/20",
    border: "hover:border-cyan-500/50",
    text: "text-cyan-400",
  },
  green: {
    bg: "from-green-500/20 to-emerald-500/20",
    border: "hover:border-green-500/50",
    text: "text-green-400",
  },
  orange: {
    bg: "from-orange-500/20 to-amber-500/20",
    border: "hover:border-orange-500/50",
    text: "text-orange-400",
  },
};

function getDisplayUrl(url: string): string {
  if (url.startsWith("/")) {
    return "Local";
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {
    return url;
  }
}

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const Icon = iconMap[project.icon] || Globe;
  const colors = colorMap[project.color] || colorMap.blue;
  const isExternal = !project.url.startsWith("/");
  const displayUrl = getDisplayUrl(project.url);

  const linkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};

  return (
    <a
      href={project.url}
      {...linkProps}
      className={`
        group block relative overflow-hidden rounded-xl
        bg-gradient-to-br ${colors.bg}
        backdrop-blur-sm
        border border-white/10 ${colors.border}
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
      `}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" />

      {/* Content */}
      <div className="relative p-5">
        {/* Header with icon and launch button */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={`
              p-3 rounded-lg
              bg-gradient-to-br ${colors.bg}
              border border-white/10
              ${colors.text}
            `}
          >
            <Icon className="w-6 h-6" />
          </div>

          {/* Launch button */}
          <div
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-white/5 border border-white/10
              text-xs font-medium text-gray-300
              group-hover:bg-white/10 group-hover:border-white/20
              transition-all duration-300
            `}
          >
            <span>Launch</span>
            {isExternal && <ExternalLink className="w-3 h-3" />}
          </div>
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-white/90 transition-colors">
          {project.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">
          {project.description}
        </p>

        {/* URL hint */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Globe className="w-3 h-3" />
          <span className="truncate">{displayUrl}</span>
        </div>
      </div>

      {/* Hover glow effect */}
      <div
        className={`
          absolute inset-0 opacity-0 group-hover:opacity-100
          bg-gradient-to-br ${colors.bg}
          transition-opacity duration-300
          pointer-events-none
        `}
        style={{ mixBlendMode: "overlay" }}
      />
    </a>
  );
}
