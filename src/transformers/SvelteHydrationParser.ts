import { logger } from '../utils/logger';

export interface ExtractedHydrationData {
  meterId: string;
  serialNumber: string;
  make: string;
  phase: string;
  installationStatus: string;
  installationType: string;
  hierarchy: {
    zone: string;
    circle: string;
    division: string;
    subdivision: string;
    subStation: string;
    feeder: string;
    dt: string;
  };
}

export class SvelteHydrationParser {
  /**
   * Anti-Corruption Layer Parser for SvelteKit __data.json hydration payloads.
   * Defensively handles embedded JSON strings (classData/installed_meter)
   * and SvelteKit index-mapped data dictionaries.
   */
  public static parse(payload: unknown, requestedMeterId: string): ExtractedHydrationData {
    let serialNumber = 'UNKNOWN';
    let make = 'UNKNOWN';
    let phase = 'single';
    let installationStatus = 'Decommissioned';
    let installationType = 'Whole Current';

    let zone = 'Jaipur Zone 1';
    let circle = 'Circle 1';
    let division = 'Division 1';
    let subdivision = 'Subdivision 1';
    let subStation = 'Substation 1';
    let feeder = 'Feeder 1';
    let dt = 'Malviya Nagar DT 1 (DT-001)';

    const primitiveStrings: string[] = [];

    const processObject = (obj: Record<string, unknown>) => {
      if (obj.serialNo || obj.serialNumber || obj.SerialNo) {
        serialNumber = String(obj.serialNo || obj.serialNumber || obj.SerialNo);
      }
      if (obj.make || obj.Make) {
        make = String(obj.make || obj.Make);
      }
      if (obj.phaseType || obj.phase || obj.PhaseType) {
        phase = String(obj.phaseType || obj.phase || obj.PhaseType);
      }
      if (obj.installStatus || obj.installationStatus || obj.InstallationStatus) {
        installationStatus = String(obj.installStatus || obj.installationStatus || obj.InstallationStatus);
      }
      if (obj.installationType || obj.InstallationType) {
        installationType = String(obj.installationType || obj.InstallationType);
      }

      if (obj.zone || obj.Zone) zone = String(obj.zone || obj.Zone);
      if (obj.circle || obj.Circle) circle = String(obj.circle || obj.Circle);
      if (obj.division || obj.Division) division = String(obj.division || obj.Division);
      if (obj.subdivision || obj.Subdivision) subdivision = String(obj.subdivision || obj.Subdivision);
      if (obj.subStation || obj.substation || obj['Sub Station'] || obj.Substation) {
        subStation = String(obj.subStation || obj.substation || obj['Sub Station'] || obj.Substation);
      }
      if (obj.feeder || obj.Feeder) feeder = String(obj.feeder || obj.Feeder);
      if (obj.dt || obj.DT) dt = String(obj.dt || obj.DT);
    };

    const traverse = (node: unknown) => {
      if (!node) return;

      if (typeof node === 'string') {
        primitiveStrings.push(node);

        // Check if string contains embedded JSON (e.g. classData / installed_meter)
        if (node.startsWith('{') && (node.includes('installed_meter') || node.includes('MeterId'))) {
          try {
            const parsed = JSON.parse(node);
            const target = parsed.installed_meter || parsed.meter || parsed;
            if (typeof target === 'object' && target !== null) {
              processObject(target as Record<string, unknown>);
            }
          } catch (e) {
            // Suppress JSON parse errors on normal text
          }
        }
        return;
      }

      if (typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        processObject(obj);

        if (Array.isArray(node)) {
          for (const item of node) traverse(item);
        } else {
          for (const val of Object.values(obj)) traverse(val);
        }
      }
    };

    traverse(payload);

    // Parse SvelteKit index-mapped data arrays (nodes -> data -> index mapping)
    if (payload && typeof payload === 'object' && 'nodes' in payload) {
      const nodes = (payload as Record<string, unknown>).nodes;
      if (Array.isArray(nodes)) {
        for (const nodeItem of nodes) {
          if (nodeItem && typeof nodeItem === 'object' && 'data' in nodeItem) {
            const dataArr = (nodeItem as Record<string, unknown>).data;
            if (Array.isArray(dataArr)) {
              for (const item of dataArr) {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                  const mapObj = item as Record<string, unknown>;
                  const keys = Object.keys(mapObj);

                  if (keys.includes('Zone') || keys.includes('Circle') || keys.includes('Installation Type')) {
                    const resolveIndex = (val: unknown): string => {
                      if (typeof val === 'number' && dataArr[val] !== undefined) {
                        return String(dataArr[val]);
                      }
                      return '';
                    };

                    if (mapObj['Installation Type']) {
                      const resolved = resolveIndex(mapObj['Installation Type']);
                      if (resolved) installationType = resolved;
                    }
                    if (mapObj['Zone']) {
                      const resolved = resolveIndex(mapObj['Zone']);
                      if (resolved) zone = resolved;
                    }
                    if (mapObj['Circle']) {
                      const resolved = resolveIndex(mapObj['Circle']);
                      if (resolved) circle = resolved;
                    }
                    if (mapObj['Division']) {
                      const resolved = resolveIndex(mapObj['Division']);
                      if (resolved) division = resolved;
                    }
                    if (mapObj['Subdivision']) {
                      const resolved = resolveIndex(mapObj['Subdivision']);
                      if (resolved) subdivision = resolved;
                    }
                    if (mapObj['Sub Station'] || mapObj['Substation']) {
                      const resolved = resolveIndex(mapObj['Sub Station'] || mapObj['Substation']);
                      if (resolved) subStation = resolved;
                    }
                    if (mapObj['Feeder']) {
                      const resolved = resolveIndex(mapObj['Feeder']);
                      if (resolved) feeder = resolved;
                    }
                    if (mapObj['DT']) {
                      const resolved = resolveIndex(mapObj['DT']);
                      if (resolved) dt = resolved;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // String primitive fallback scanning for serialNumber & make
    if (serialNumber === 'UNKNOWN') {
      const serialMatch = primitiveStrings.find((s) => /^SE\d+/i.test(s) || /^GE\d+/i.test(s) || /^AL\d+/i.test(s) || /^L&\d+/i.test(s) || /^HP\d+/i.test(s));
      if (serialMatch) serialNumber = serialMatch;
    }

    if (make === 'UNKNOWN') {
      const knownMakes = ['HPL', 'L&T', 'GENUS', 'SECURE', 'ALLIED', 'SCHNEIDER', 'ABB'];
      const makeMatch = primitiveStrings.find((s) => knownMakes.includes(s.toUpperCase()));
      if (makeMatch) make = makeMatch;
    }

    logger.debug(
      { requestedMeterId, serialNumber, make, phase, installationStatus, installationType, zone, dt },
      'SvelteHydrationParser extracted hydration properties'
    );

    return {
      meterId: requestedMeterId,
      serialNumber,
      make,
      phase,
      installationStatus,
      installationType,
      hierarchy: {
        zone,
        circle,
        division,
        subdivision,
        subStation,
        feeder,
        dt,
      },
    };
  }
}
