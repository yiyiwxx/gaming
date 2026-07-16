import { lolConnector } from "./lolConnector";
import { valorantConnector } from "./valorantConnector";

export const esportsConnectors = [lolConnector, valorantConnector];

export type { EsportsConnector } from "./types";
