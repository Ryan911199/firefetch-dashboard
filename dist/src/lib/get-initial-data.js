"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialData = getInitialData;
exports.getMetricsPageData = getMetricsPageData;
exports.getDockerPageData = getDockerPageData;
exports.getServicesPageData = getServicesPageData;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CACHE_DIR = "/tmp/dashboard-cache";
const METRICS_CACHE_FILE = path_1.default.join(CACHE_DIR, "metrics.json");
const SERVICES_CACHE_FILE = path_1.default.join(CACHE_DIR, "services.json");
const CONTAINERS_CACHE_FILE = path_1.default.join(CACHE_DIR, "containers.json");
const METRICS_HISTORY_FILE = path_1.default.join(CACHE_DIR, "metrics-history.json");
function readCacheFile(filePath) {
    try {
        if (fs_1.default.existsSync(filePath)) {
            const content = fs_1.default.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(content);
            return parsed.data;
        }
    }
    catch (error) {
        console.error(`Failed to read cache file ${filePath}:`, error);
    }
    return null;
}
function getInitialData() {
    const metrics = readCacheFile(METRICS_CACHE_FILE);
    const servicesData = readCacheFile(SERVICES_CACHE_FILE);
    const containersData = readCacheFile(CONTAINERS_CACHE_FILE);
    return {
        metrics: metrics || null,
        services: servicesData?.services || [],
        containers: containersData?.containers || [],
    };
}
function getMetricsPageData() {
    const metrics = readCacheFile(METRICS_CACHE_FILE);
    let history = [];
    try {
        if (fs_1.default.existsSync(METRICS_HISTORY_FILE)) {
            const content = fs_1.default.readFileSync(METRICS_HISTORY_FILE, "utf-8");
            history = JSON.parse(content) || [];
        }
    }
    catch (error) {
        console.error("Failed to read metrics history:", error);
    }
    return {
        metrics: metrics || null,
        history,
    };
}
function getDockerPageData() {
    const containersData = readCacheFile(CONTAINERS_CACHE_FILE);
    return {
        containers: containersData?.containers || [],
    };
}
function getServicesPageData() {
    const servicesData = readCacheFile(SERVICES_CACHE_FILE);
    return {
        services: servicesData?.services || [],
    };
}
