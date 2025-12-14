"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ProjectCard } from "@/components/ui/project-card";
import { PROJECTS } from "@/lib/config";
import { Rocket, Layers, Cog, Server } from "lucide-react";
import { useMemo } from "react";

type ProjectType = "webapp" | "automation" | "infrastructure";

interface SectionConfig {
  title: string;
  icon: React.ElementType;
  iconColor: string;
}

const SECTION_CONFIG: Record<ProjectType, SectionConfig> = {
  webapp: {
    title: "Applications",
    icon: Layers,
    iconColor: "text-purple-400",
  },
  automation: {
    title: "Automation",
    icon: Cog,
    iconColor: "text-amber-400",
  },
  infrastructure: {
    title: "Infrastructure",
    icon: Server,
    iconColor: "text-blue-400",
  },
};

const SECTION_ORDER: ProjectType[] = ["webapp", "automation", "infrastructure"];

export function ProjectLauncher() {
  const groupedProjects = useMemo(() => {
    const groups: Record<ProjectType, typeof PROJECTS> = {
      webapp: [],
      automation: [],
      infrastructure: [],
    };

    PROJECTS.forEach((project) => {
      const type = project.type as ProjectType;
      if (groups[type]) {
        groups[type].push(project);
      } else {
        // Default to webapp if unknown type
        groups.webapp.push(project);
      }
    });

    return groups;
  }, []);

  const totalProjects = PROJECTS.length;

  return (
    <div className="flex h-screen bg-[#0f172a] text-gray-100 font-sans overflow-hidden selection:bg-purple-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] opacity-30" />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 lg:ml-64">
        {/* Header */}
        <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-6 z-10 shrink-0 mt-14 lg:mt-0">
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Rocket className="text-purple-400" size={24} />
              Projects
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {totalProjects} project{totalProjects !== 1 ? "s" : ""} available
            </p>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                Online
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-24 lg:pb-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8 lg:space-y-10 animate-fade-in pb-10">
              {SECTION_ORDER.map((type) => {
                const projects = groupedProjects[type];
                if (projects.length === 0) return null;

                const config = SECTION_CONFIG[type];
                const IconComponent = config.icon;

                return (
                  <section key={type}>
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-4 lg:mb-6">
                      <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                        <IconComponent size={18} className={config.iconColor} />
                      </div>
                      <div>
                        <h2 className="text-lg lg:text-xl font-semibold text-white">
                          {config.title}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {projects.length} project{projects.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Projects Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                      {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                      ))}
                    </div>
                  </section>
                );
              })}

              {totalProjects === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-4">
                    <Rocket size={32} className="text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">
                    No Projects Configured
                  </h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Add projects to your configuration to see them here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
