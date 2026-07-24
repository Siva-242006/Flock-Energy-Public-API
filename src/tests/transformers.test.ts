import { describe, it, expect } from 'vitest';
import { SvelteHydrationParser } from '../transformers/SvelteHydrationParser';
import { MeterTransformer } from '../transformers/MeterTransformer';
import { EnergyTransformer } from '../transformers/EnergyTransformer';
import { DTTransformer } from '../transformers/DTTransformer';

describe('SvelteHydrationParser', () => {
  it('extracts meter attributes and hierarchy correctly from raw SvelteKit payloads', () => {
    const rawPayload = [
      {
        meterId: 'J100000',
        serialNo: 'SE33962',
        make: 'HPL',
        phaseType: 'single',
        installStatus: 'Decommissioned',
        installationType: 'Whole Current',
        hierarchy: {
          zone: 'Jaipur Zone 1',
          circle: 'Circle 1',
          division: 'Division 1',
          subdivision: 'Subdivision 1',
          subStation: 'Substation 1',
          feeder: 'Feeder 1',
          dt: 'Malviya Nagar DT 1 (DT-001)',
        },
      },
    ];

    const result = SvelteHydrationParser.parse(rawPayload, 'J100000');

    expect(result.meterId).toBe('J100000');
    expect(result.serialNumber).toBe('SE33962');
    expect(result.make).toBe('HPL');
    expect(result.phase).toBe('single');
    expect(result.installationStatus).toBe('Decommissioned');
    expect(result.installationType).toBe('Whole Current');
    expect(result.hierarchy.zone).toBe('Jaipur Zone 1');
    expect(result.hierarchy.dt).toBe('Malviya Nagar DT 1 (DT-001)');
  });

  it('provides safe fallbacks if hydration payload is empty', () => {
    const result = SvelteHydrationParser.parse(null, 'J999999');

    expect(result.meterId).toBe('J999999');
    expect(result.serialNumber).toBe('UNKNOWN');
    expect(result.make).toBe('UNKNOWN');
    expect(result.hierarchy.zone).toBe('Jaipur Zone 1');
  });
});

describe('MeterTransformer', () => {
  it('transforms LegacyMeterSearchItemDTO to PublicMeterSummaryDTO', () => {
    const legacyItem = {
      meterId: 'J100000',
      serialNo: 'SE33962',
      make: 'HPL',
      phaseType: 'single',
      installStatus: 'Decommissioned',
      dtCode: 'DT-001',
    };

    const summary = MeterTransformer.toSummaryDTO(legacyItem);

    expect(summary).toEqual({
      meterId: 'J100000',
      serialNumber: 'SE33962',
      make: 'HPL',
      phase: 'single',
      installationStatus: 'Decommissioned',
      dtCode: 'DT-001',
    });
  });

  it('converts string geo coordinates to numbers in toDetailDTO', () => {
    const hydrationData = SvelteHydrationParser.parse(null, 'J100000');
    const geoData = { latitude: '26.93896', longitude: '75.83095' };

    const detail = MeterTransformer.toDetailDTO(hydrationData, geoData);

    expect(detail.location.latitude).toBe(26.93896);
    expect(detail.location.longitude).toBe(75.83095);
    expect(typeof detail.location.latitude).toBe('number');
  });
});

describe('EnergyTransformer', () => {
  it('converts legacy energy telemetry into PublicEnergyRecordDTO with ISO timestamp', () => {
    const legacyEnergy = {
      timestamp: '23/06/2026 23:30',
      kwh: '48438.74',
      kvah: '52313.84',
      voltR: '226',
    };

    const record = EnergyTransformer.toRecordDTO(legacyEnergy);

    expect(record.timestamp).toBe('2026-06-23T23:30:00');
    expect(record.kWh).toBe(48438.74);
    expect(record.kVAh).toBe(52313.84);
    expect(record.voltage).toBe(226);
  });
});

describe('DTTransformer', () => {
  it('transforms legacy DT item to PublicDTDTO', () => {
    const legacyDT = {
      code: 'DT-001',
      name: 'Malviya Nagar DT 1',
      feederCode: 'F-001',
      capacityKva: 100,
    };

    const result = DTTransformer.toPublicDTO(legacyDT);

    expect(result).toEqual({
      code: 'DT-001',
      name: 'Malviya Nagar DT 1',
      feederCode: 'F-001',
      capacityKva: 100,
    });
  });
});
