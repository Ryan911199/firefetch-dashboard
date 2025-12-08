"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/5 rounded-lg",
        className
      )}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl">
      <div className="flex justify-between items-start mb-4 lg:mb-6">
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3 lg:p-4 rounded-2xl">
      <Skeleton className="w-10 h-10 mx-auto rounded-xl mb-2 lg:mb-3" />
      <Skeleton className="h-4 w-16 mx-auto" />
    </div>
  );
}

export function ContainerRowSkeleton() {
  return (
    <div className="flex items-center gap-3 lg:gap-4 p-3 bg-black/20 rounded-xl border border-white/5">
      <Skeleton className="w-2 h-2 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-1" />
        <div className="flex items-center gap-3 mt-2">
          <Skeleton className="h-1.5 w-20" />
          <Skeleton className="h-1.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  );
}

export function NetworkCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl">
      <div className="flex justify-between items-center mb-4 lg:mb-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-12 rounded" />
      </div>
      <div className="space-y-6 lg:space-y-8">
        <div>
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 animate-pulse">
      {/* Top Row: Key Metrics */}
      <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Network Card */}
      <NetworkCardSkeleton />

      {/* Services Grid */}
      <div className="col-span-1 lg:col-span-3">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
          {[...Array(6)].map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Docker Containers */}
      <div className="col-span-1 lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl">
        <Skeleton className="h-5 w-40 mb-4 lg:mb-6" />
        <div className="space-y-3 lg:space-y-4">
          {[...Array(3)].map((_, i) => (
            <ContainerRowSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="col-span-1 bg-white/5 backdrop-blur-xl border border-white/10 p-4 lg:p-5 rounded-2xl">
        <Skeleton className="h-5 w-28 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
