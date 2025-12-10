"use strict";
/**
 * Metrics Collector for FireFetch Dashboard
 *
 * Collects system metrics, Docker container stats, and service health
 * at configurable intervals and stores them in SQLite.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERVALS = void 0;
exports.onMetricsUpdate = onMetricsUpdate;
exports.onContainerUpdate = onContainerUpdate;
exports.onServiceUpdate = onServiceUpdate;
exports.collectSystemMetrics = collectSystemMetrics;
exports.collectContainerStats = collectContainerStats;
exports.collectServiceHealth = collectServiceHealth;
exports.startCollector = startCollector;
exports.stopCollector = stopCollector;
exports.isCollectorRunning = isCollectorRunning;
const child_process_1 = require("child_process");
const util_1 = require("util");
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./database");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Collection intervals (in milliseconds)
exports.INTERVALS = {
    SYSTEM_METRICS: 5000, // 5 seconds
    DOCKER_STATS: 10000, // 10 seconds
    SERVICE_HEALTH: 30000, // 30 seconds
};
// Store previous values for rate calculations
let prevCpuStats = null;
let prevNetStats = null;
let prevServiceStatus = new Map();
const metricsListeners = new Set();
const containerListeners = new Set();
const serviceListeners = new Set();
function onMetricsUpdate(listener) {
    metricsListeners.add(listener);
    return () => metricsListeners.delete(listener);
}
function onContainerUpdate(listener) {
    containerListeners.add(listener);
    return () => containerListeners.delete(listener);
}
function onServiceUpdate(listener) {
    serviceListeners.add(listener);
    return () => serviceListeners.delete(listener);
}
// ============================================
// SYSTEM METRICS COLLECTION
// ============================================
async function getCpuUsage() {
    try {
        const { stdout } = await execAsync('head -1 /proc/stat');
        const parts = stdout.trim().split(/\s+/);
        const idle = parseInt(parts[4], 10) + parseInt(parts[5], 10);
        const total = parts.slice(1, 11).reduce((sum, val) => sum + parseInt(val, 10), 0);
        const now = Date.now();
        if (prevCpuStats && now - prevCpuStats.timestamp < 10000) {
            const idleDiff = idle - prevCpuStats.idle;
            const totalDiff = total - prevCpuStats.total;
            const usage = totalDiff > 0 ? 100 * (1 - idleDiff / totalDiff) : 0;
            prevCpuStats = { idle, total, timestamp: now };
            return Math.max(0, Math.min(100, usage));
        }
        prevCpuStats = { idle, total, timestamp: now };
        // Fallback to os module
        const cpus = os_1.default.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach((cpu) => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        return 100 - (100 * totalIdle) / totalTick;
    }
    catch {
        // Fallback
        const cpus = os_1.default.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach((cpu) => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        return 100 - (100 * totalIdle) / totalTick;
    }
}
async function getDiskUsage() {
    try {
        const { stdout } = await execAsync("df -B1 / | tail -1 | awk '{print $2,$3,$5}'");
        const [total, used, percent] = stdout.trim().split(' ');
        return {
            total: parseInt(total, 10),
            used: parseInt(used, 10),
            percent: parseInt(percent.replace('%', ''), 10),
        };
    }
    catch {
        return { used: 0, total: 0, percent: 0 };
    }
}
async function getNetworkStats() {
    try {
        const now = Date.now();
        const { stdout } = await execAsync("cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2, $10}'");
        const [rx, tx] = stdout.trim().split(' ').map(Number);
        if (!rx || !tx) {
            return { rx: 0, tx: 0 };
        }
        if (prevNetStats) {
            const timeDiff = (now - prevNetStats.timestamp) / 1000;
            if (timeDiff > 0) {
                const rxRate = Math.max(0, (rx - prevNetStats.rx) / timeDiff);
                const txRate = Math.max(0, (tx - prevNetStats.tx) / timeDiff);
                prevNetStats = { rx, tx, timestamp: now };
                return { rx: rxRate, tx: txRate };
            }
        }
        prevNetStats = { rx, tx, timestamp: now };
        return { rx: 0, tx: 0 };
    }
    catch {
        return { rx: 0, tx: 0 };
    }
}
async function collectSystemMetrics() {
    const [cpu, disk, network] = await Promise.all([
        getCpuUsage(),
        getDiskUsage(),
        getNetworkStats(),
    ]);
    const totalMem = os_1.default.totalmem();
    const freeMem = os_1.default.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os_1.default.loadavg();
    const metrics = {
        timestamp: Date.now(),
        cpu_percent: cpu,
        memory_used: usedMem,
        memory_total: totalMem,
        memory_percent: (usedMem / totalMem) * 100,
        disk_used: disk.used,
        disk_total: disk.total,
        disk_percent: disk.percent,
        network_rx: network.rx,
        network_tx: network.tx,
        load_1m: loadAvg[0],
        load_5m: loadAvg[1],
        load_15m: loadAvg[2],
        uptime: os_1.default.uptime(),
    };
    // Store in database
    (0, database_1.insertMetricsSnapshot)(metrics);
    // Check for alerts
    checkResourceAlerts(metrics);
    // Notify listeners
    metricsListeners.forEach((listener) => listener(metrics));
    return metrics;
}
function checkResourceAlerts(metrics) {
    const previous = (0, database_1.getLatestMetrics)();
    if (metrics.cpu_percent > 90 && (!previous || previous.cpu_percent <= 90)) {
        (0, database_1.addNotification)({
            timestamp: Date.now(),
            type: 'warning',
            title: 'High CPU Usage',
            message: `CPU usage is at ${metrics.cpu_percent.toFixed(1)}%`,
        });
    }
    if (metrics.memory_percent > 90 && (!previous || previous.memory_percent <= 90)) {
        (0, database_1.addNotification)({
            timestamp: Date.now(),
            type: 'warning',
            title: 'High Memory Usage',
            message: `Memory usage is at ${metrics.memory_percent.toFixed(1)}%`,
        });
    }
    if (metrics.disk_percent > 90 && (!previous || previous.disk_percent <= 90)) {
        (0, database_1.addNotification)({
            timestamp: Date.now(),
            type: 'error',
            title: 'Low Disk Space',
            message: `Disk usage is at ${metrics.disk_percent.toFixed(1)}%`,
        });
    }
}
// ============================================
// DOCKER CONTAINER COLLECTION
// ============================================
function parseDockerStats(statsOutput) {
    const stats = new Map();
    const lines = statsOutput.trim().split('\n').slice(1);
    for (const line of lines) {
        const parts = line.split(/\s{2,}/);
        if (parts.length >= 4) {
            const name = parts[1];
            const cpuStr = parts[2].replace('%', '');
            const memParts = parts[3].split(' / ');
            stats.set(name, {
                cpu: parseFloat(cpuStr) || 0,
                memUsed: parseMemory(memParts[0]),
                memLimit: parseMemory(memParts[1]),
            });
        }
    }
    return stats;
}
function parseMemory(memStr) {
    const match = memStr.match(/^([\d.]+)([KMGTP]?i?B?)$/i);
    if (!match)
        return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers = {
        B: 1,
        KB: 1024,
        KIB: 1024,
        MB: 1024 ** 2,
        MIB: 1024 ** 2,
        GB: 1024 ** 3,
        GIB: 1024 ** 3,
        TB: 1024 ** 4,
        TIB: 1024 ** 4,
    };
    return value * (multipliers[unit] || 1);
}
async function collectContainerStats() {
    try {
        const timestamp = Date.now();
        // Get container list
        const { stdout: psOutput } = await execAsync('docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}"');
        // Get container stats
        const { stdout: statsOutput } = await execAsync("docker stats --no-stream --format 'table {{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'");
        const statsMap = parseDockerStats(statsOutput);
        const containers = [];
        for (const line of psOutput.trim().split('\n')) {
            if (!line)
                continue;
            const [id, name, image, ...statusParts] = line.split('\t');
            const statusStr = statusParts.join('\t');
            let status = 'stopped';
            if (statusStr.includes('Up'))
                status = 'running';
            else if (statusStr.includes('Restarting'))
                status = 'restarting';
            else if (statusStr.includes('Paused'))
                status = 'paused';
            const stats = statsMap.get(name) || { cpu: 0, memUsed: 0, memLimit: 0 };
            containers.push({
                timestamp,
                container_id: id.substring(0, 12),
                container_name: name,
                cpu_percent: stats.cpu,
                memory_used: stats.memUsed,
                memory_limit: stats.memLimit || 1073741824,
                status,
            });
        }
        // Store in database
        if (containers.length > 0) {
            (0, database_1.insertContainerStats)(containers);
        }
        // Notify listeners
        containerListeners.forEach((listener) => listener(containers));
        return containers;
    }
    catch (error) {
        console.error('Failed to collect container stats:', error);
        return [];
    }
}
async function loadServicesConfig() {
    try {
        const servicesPath = '/home/ubuntu/ai/infrastructure/services.json';
        // In Docker, this is mounted at /app/data/services.json
        const dockerPath = '/app/data/services.json';
        let configPath = servicesPath;
        if (!fs_1.default.existsSync(servicesPath) && fs_1.default.existsSync(dockerPath)) {
            configPath = dockerPath;
        }
        const data = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
        return data.services || [];
    }
    catch (error) {
        console.error('Failed to load services config:', error);
        return [];
    }
}
async function checkServiceHealth(service) {
    const timestamp = Date.now();
    let status = 'offline';
    let responseTime;
    try {
        const startTime = Date.now();
        const response = await fetch(service.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
        });
        responseTime = Date.now() - startTime;
        if (response.ok || response.status === 301 || response.status === 302 || response.status === 401) {
            status = responseTime > 2000 ? 'degraded' : 'online';
        }
        else if (response.status >= 500) {
            status = 'offline';
        }
        else {
            status = 'degraded';
        }
    }
    catch {
        status = 'offline';
    }
    return {
        timestamp,
        service_id: service.subdomain,
        service_name: service.name,
        status,
        response_time: responseTime,
    };
}
async function collectServiceHealth() {
    const services = await loadServicesConfig();
    const timestamp = Date.now();
    const results = await Promise.all(services.map((service) => checkServiceHealth(service)));
    // Check for status changes and create notifications
    for (const service of results) {
        const prevStatus = prevServiceStatus.get(service.service_id);
        if (prevStatus && prevStatus !== service.status) {
            if (service.status === 'offline') {
                (0, database_1.addNotification)({
                    timestamp,
                    type: 'error',
                    title: 'Service Offline',
                    message: `${service.service_name} is now offline`,
                    service_id: service.service_id,
                });
            }
            else if (service.status === 'online' && prevStatus === 'offline') {
                (0, database_1.addNotification)({
                    timestamp,
                    type: 'success',
                    title: 'Service Recovered',
                    message: `${service.service_name} is back online`,
                    service_id: service.service_id,
                });
            }
            else if (service.status === 'degraded') {
                (0, database_1.addNotification)({
                    timestamp,
                    type: 'warning',
                    title: 'Service Degraded',
                    message: `${service.service_name} is experiencing issues`,
                    service_id: service.service_id,
                });
            }
        }
        prevServiceStatus.set(service.service_id, service.status);
    }
    // Store in database
    if (results.length > 0) {
        (0, database_1.insertServiceStatus)(results);
    }
    // Notify listeners
    serviceListeners.forEach((listener) => listener(results));
    return results;
}
// ============================================
// COLLECTOR LIFECYCLE
// ============================================
let metricsInterval = null;
let containersInterval = null;
let servicesInterval = null;
let isRunning = false;
function startCollector() {
    if (isRunning)
        return;
    isRunning = true;
    console.log('[Metrics Collector] Starting...');
    // Collect immediately on start
    collectSystemMetrics().catch(console.error);
    collectContainerStats().catch(console.error);
    collectServiceHealth().catch(console.error);
    // Set up intervals
    metricsInterval = setInterval(() => {
        collectSystemMetrics().catch(console.error);
    }, exports.INTERVALS.SYSTEM_METRICS);
    containersInterval = setInterval(() => {
        collectContainerStats().catch(console.error);
    }, exports.INTERVALS.DOCKER_STATS);
    servicesInterval = setInterval(() => {
        collectServiceHealth().catch(console.error);
    }, exports.INTERVALS.SERVICE_HEALTH);
    console.log('[Metrics Collector] Started with intervals:', {
        systemMetrics: `${exports.INTERVALS.SYSTEM_METRICS}ms`,
        dockerStats: `${exports.INTERVALS.DOCKER_STATS}ms`,
        serviceHealth: `${exports.INTERVALS.SERVICE_HEALTH}ms`,
    });
}
function stopCollector() {
    if (!isRunning)
        return;
    isRunning = false;
    if (metricsInterval)
        clearInterval(metricsInterval);
    if (containersInterval)
        clearInterval(containersInterval);
    if (servicesInterval)
        clearInterval(servicesInterval);
    metricsInterval = null;
    containersInterval = null;
    servicesInterval = null;
    console.log('[Metrics Collector] Stopped');
}
function isCollectorRunning() {
    return isRunning;
}
