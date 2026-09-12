import { LegacyEnergyItemDTO } from '../dto/legacy';
import { PublicEnergyRecordDTO } from '../dto/public';

export class EnergyTransformer {
  public static toRecordDTO(item: LegacyEnergyItemDTO): PublicEnergyRecordDTO {
    const kWh = typeof item.kwh === 'number' ? item.kwh : parseFloat(String(item.kwh || '0'));
    const kVAh = typeof item.kvah === 'number' ? item.kvah : parseFloat(String(item.kvah || '0'));
    const voltage =
      typeof item.voltR === 'number' ? item.voltR : parseFloat(String(item.voltR || '0'));

    return {
      timestamp: EnergyTransformer.formatIsoTimestamp(item.timestamp),
      kWh: isNaN(kWh) ? 0 : kWh,
      kVAh: isNaN(kVAh) ? 0 : kVAh,
      voltage: isNaN(voltage) ? 0 : voltage,
    };
  }

  public static formatIsoTimestamp(rawTimestamp: string): string {
    if (!rawTimestamp) return new Date().toISOString();

    // Check if already in ISO format YYYY-MM-DD...
    if (/^\d{4}-\d{2}-\d{2}/.test(rawTimestamp)) {
      return rawTimestamp;
    }

    // Parse DD/MM/YYYY HH:mm format
    const match = rawTimestamp.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/,
    );
    if (match) {
      const [, day, month, year, hours = '00', minutes = '00', seconds = '00'] = match;
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    // Fallback: Attempt standard Date parsing
    const parsed = new Date(rawTimestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('.')[0];
    }

    return rawTimestamp;
  }
}
